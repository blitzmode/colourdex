from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
CORS(app)

# Execute a SQL query and return fetched rows (empty list on error).
def sql(query, params=()):
    try:
        with sqlite3.connect("colourdex.db") as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            return cursor.fetchall()
    except Exception as e:
        print("SQL Error:", e)
        return []

# Return True if the variable is a string.
def is_string(var): 
    return isinstance(var, str)

# Helper to return a JSON 400 Bad Request with an error message.
def bad_request(msg="Invalid request"):
    return jsonify({"error": msg}), 400

# Determine friendship status between two user ids.
def getFriend(viewID, otherID):
    if viewID == otherID:
        return None

    rows = sql("SELECT user1, accepted FROM FRIEND WHERE (user1 = ? AND user2 = ?) OR (user1 = ? AND user2 = ?)",
               [otherID, viewID, viewID, otherID])
    if not rows:
        return {"mes": "Add Friend", "open": True}

    user1, accepted = rows[0]
    if accepted == 0:
        if user1 == viewID:
            return {"mes": "Waiting", "open": False}
        else:
            return {"mes": "Accept Friend", "open": True}
    return {"mes": "Friends", "open": False}

# Check and award a badge to a user if the badge task is completed.
def badgeTest(badge, user):
    if not sql("SELECT * FROM USER_BADGE WHERE user = ? AND badge = ?", [user, badge]):
        task = sql("SELECT task FROM BADGE WHERE id = ?", [badge])
        if not task:
            return False
        done = sql(task[0][0], [user])
        print(done)
        if not done:
            return False
        if done[0][0] == 0:
            return False
        sql("INSERT INTO USER_BADGE(user, badge) VALUES(?, ?)", [user, badge])
    return True

@app.route('/find', methods=['POST'])
# Find a colour name by its hex and return it as JSON.
def find():
    data = request.get_json(silent=True)
    if not data or "hex" not in data:
        return bad_request("Missing 'hex'")
    hex_val = data["hex"]

    rows = sql("SELECT name FROM COLOUR WHERE hex = ?", [hex_val])
    if rows:
        return jsonify({"name": rows[0][0]})
    return jsonify({})

@app.route('/find/rate', methods=['POST'])
# Return ratings for a colour along with user info and friendship state.
def rates():
    data = request.get_json(silent=True)
    if not data or "hex" not in data or "view" not in data:
        return bad_request("Missing values")
    hex_val = data["hex"]
    print(hex_val)

    rows = sql("""SELECT USER_COLOUR.desc, USER_COLOUR.score, USER.username, USER.background, USER.id, USER.pic
        FROM USER_COLOUR
        JOIN USER ON USER_COLOUR.user = USER.id
        WHERE USER_COLOUR.colour = ? """, [hex_val])
    rows_for_js = []
    for row in rows:
        rows_for_js.append({"desc": row[0], "score": row[1], "name": row[2], "backrgound": row[3], "id": row[4], "friend": getFriend(data["view"], row[4]), "pic": row[5]})
    return jsonify({"table": rows_for_js})

@app.route('/name', methods=['POST'])
# Add a name for a colour.
def name():
    data = request.get_json(silent=True)
    if not data or "hex" not in data or "name" not in data:
        return bad_request("Missing fields")

    existing = sql("SELECT name FROM COLOUR WHERE hex = ?", [data["hex"]])
    if not existing:
        sql("INSERT INTO COLOUR(hex, name) VALUES(?, ?)", [data["hex"], data["name"]])
    return jsonify({})


@app.route('/rate', methods=['POST'])
# Submit a user's rating and description for a colour.
def rate():
    data = request.get_json(silent=True)
    if not data or "hex" not in data or "score" not in data or "desc" not in data or "user" not in data:
        return bad_request("Missing fields")

    user_data = data["user"]
    if not isinstance(user_data, dict) or "name" not in user_data or "pas" not in user_data:
        return bad_request("Missing user info")

    uname, pas = user_data["name"], user_data["pas"]

    user = sql("SELECT id FROM USER WHERE username = ? and password = ?", [uname, pas])
    if not user:
        return bad_request("Invalid user credentials")

    # check colour exists
    if not sql("SELECT * FROM COLOUR WHERE hex = ?", [data["hex"]]):
        return bad_request("Colour does not exist")

    sql("INSERT INTO USER_COLOUR (colour, user, score, desc) VALUES (?, ?, ?, ?)",
        [data["hex"], user[0][0], data["score"], data["desc"]])

    return jsonify({})


@app.route('/login', methods=['POST'])
# Authenticate a user and return their uid on success.
def login():
    data = request.get_json(silent=True)
    if not data or "name" not in data or "pas" not in data:
        return bad_request("Missing username or password")

    name, pas = data["name"], data["pas"]
    user = sql("SELECT id FROM USER WHERE username = ? and password = ?", [name, pas])
    if not user:
        return jsonify({"error": "Incorrect password or username"}), 401
    return jsonify({"uid": user[0][0]})


@app.route('/signup', methods=['POST'])
# Create a new user account and return the new uid.
def signup():
    data = request.get_json(silent=True)
    if not data or "name" not in data or "pas" not in data:
        return bad_request("Missing fields")

    name, pas = data["name"], data["pas"]

    if not is_string(name) or len(name) < 4 or not name.isalpha():
        return bad_request("Username must be at least 4 letters")
    if not is_string(pas) or len(pas) < 6:
        return bad_request("Password must be at least 6 characters")

    if sql("SELECT * FROM USER WHERE username = ?", [name]):
        return bad_request("Username taken")

    sql("INSERT INTO USER (username, password) VALUES (?, ?)", [name, pas])
    user = sql("SELECT id FROM USER WHERE username = ? and password = ?", [name, pas])
    return jsonify({"uid": user[0][0]})


@app.route('/user', methods=['POST'])
# Return profile info for another user and friendship state.
def user():
    data = request.get_json(silent=True)
    if not data or "view" not in data or "other" not in data:
        return bad_request("Missing fields")

    other = sql("SELECT username, background, pic FROM USER WHERE id = ?", [data["other"]])
    if not other:
        return jsonify({})
    return jsonify({
        "name": other[0][0],
        "background": other[0][1],
        "pic": other[0][2],
        "friend": getFriend(data["view"], data["other"])
    })

@app.route('/user/colours', methods=['POST'])
# Return a list of colours found by a user.
def colours():
    data = request.get_json(silent=True)
    if not data or "id" not in data:
        return bad_request("Missing id")

    table = sql("""
        SELECT COLOUR.hex, COLOUR.name
        FROM COLOUR
        JOIN USER_COLOUR ON USER_COLOUR.colour = COLOUR.hex
        WHERE USER_COLOUR.user = ?
    """, [data["id"]])
    return jsonify({"table": table})

@app.route('/user/friends', methods=['POST'])
# Return a user's friends list.
def fiends():
    data = request.get_json(silent=True)
    if not data or "id" not in data:
        return bad_request("Missing id")
    
    friends = sql("""SELECT USER.username, USER.background, USER.id, USER.pic FROM USER
                  JOIN FRIEND ON (USER.id == FRIEND.user1 OR USER.id == FRIEND.user2) AND USER.id != ?
                  WHERE (? == FRIEND.user1 OR ? == FRIEND.user2) AND FRIEND.accepted == 1""", [data["id"], data["id"], data["id"]])
    
    _users = []
    for _user in friends:
        _users.append({"name": _user[0], "background": _user[1], "id": _user[2], "pic": _user[3]})
    return jsonify({"table": _users})

@app.route('/user/badges', methods=['POST'])
# Return all badges and whether the user has each one.
def badges():
    data = request.get_json(silent=True)
    if not data or "id" not in data:
        return bad_request("Missing id")
    
    badges = sql("SELECT name, id, path FROM BADGE")
    
    _badges = []
    for badge in badges:
        _badges.append({"name": badge[0], "id": badge[1], "path": badge[2], "done": badgeTest(badge[1], data["id"])})
    return jsonify({"table": _badges})

@app.route('/search', methods=['POST'])
# Search for users by username (partial match) and include friendship state.
def search():
    data = request.get_json(silent=True)
    if not data or "term" not in data or "view" not in data:
        return bad_request("Missing id")
    search_term = f"%{data['term']}%"               
    users = sql("SELECT username, background, id, pic FROM USER WHERE username LIKE ? AND id != ? LIMIT 10", [search_term, data["view"]])
    _users = []
    for _user in users:
        _users.append({"name": _user[0], "background": _user[1], "id": _user[2], "friend": getFriend(data["view"], _user[2]), "pic": _user[3]})
    return jsonify({"users": _users})

@app.route('/friend', methods=['POST'])
# Send or accept a friend request between users.
def friend():
    data = request.get_json(silent=True)
    if not data or "user" not in data or "other" not in data:
        return bad_request("Missing fields")

    user_data = data["user"]
    if not isinstance(user_data, dict) or "name" not in user_data or "pas" not in user_data:
        return bad_request("Missing user info")

    uname, pas = user_data["name"], user_data["pas"]

    user = sql("SELECT id FROM USER WHERE username = ? and password = ?", [uname, pas])
    if not user or user[0][0] == data["other"]:
        return bad_request("Invalid user credentials")

    rows = sql("SELECT user1, accepted FROM FRIEND WHERE (user1 = ? AND user2 = ?) OR (user1 = ? AND user2 = ?)",
               [user[0][0], data["other"], data["other"], user[0][0]])

    if not rows:
        sql("INSERT INTO FRIEND (user1, user2, accepted) VALUES (?, ?, 0)", [user[0][0], data["other"]])
        return jsonify({"mes": "Waiting"})
    elif rows[0][0] == data["other"]:
        sql("UPDATE FRIEND SET accepted = 1 WHERE user1 = ? AND user2 = ?", [data["other"], user[0][0]])
        return jsonify({"mes": "Friends"})
    return bad_request("friend resquest sent before")
    
@app.route('/background', methods=['POST'])
# Update a user's background colour if authenticated.
def background():
    data = request.get_json(silent=True)
    if not data or "user" not in data or "hex" not in data:
        return bad_request("Missing fields")

    user_data = data["user"]
    if not isinstance(user_data, dict) or "name" not in user_data or "pas" not in user_data:
        return bad_request("Missing user info")
    
    sql("UPDATE USER SET background = ? WHERE username = ? and password = ?", [data["hex"], user_data["name"], user_data["pas"]])
    return jsonify({})

@app.route('/message/send', methods=['POST'])
# Send a message from one user to another using a selected colour.
def messageS():
    data = request.get_json(silent=True)
    if not data or "user" not in data or "other" not in data or "message" not in data or "hex" not in data:
        return bad_request("Missing fields")

    user_data = data["user"]
    if not isinstance(user_data, dict) or "name" not in user_data or "pas" not in user_data:
        return bad_request("Missing user info")

    uname, pas = user_data["name"], user_data["pas"]

    user = sql("SELECT id FROM USER WHERE username = ? and password = ?", [uname, pas])
    if not user:
        return bad_request("Invalid user credentials")

    if not sql("SELECT * FROM FRIEND WHERE (user1 = ? AND user2 = ?) OR (user1 = ? AND user2 = ?) AND accepted = 1",
               [user[0][0], data["other"], data["other"], user[0][0]]):
        return bad_request("NOT FRIENDS")
    
    user_colour = sql("SELECT id FROM USER_COLOUR WHERE user = ? and colour = ?", [user[0][0], data["hex"]])
    if not user_colour:
        return bad_request("HAVE NOT FOUND COLOUR")

    sql("INSERT INTO MESSAGE (user_colour, user, message) VALUES (?, ?, ?)", [user_colour[0][0], data["other"], data["message"]])
    return(jsonify({}))

@app.route('/message/find', methods=['POST'])
# Retrieve messages between two friends.
def messageF():
    data = request.get_json(silent=True)
    if not data or "user" not in data or "other" not in data:
        return bad_request("Missing fields")

    user_data = data["user"]
    if not isinstance(user_data, dict) or "name" not in user_data or "pas" not in user_data:
        return bad_request("Missing user info")
    uname, pas = user_data["name"], user_data["pas"]

    user = sql("SELECT id FROM USER WHERE username = ? and password = ?", [uname, pas])
    if not user:
        return bad_request("Invalid user credentials")

    print(user[0][0], data["other"])
    if not sql("SELECT * FROM FRIEND WHERE ((user1 = ? AND user2 = ?) OR (user1 = ? AND user2 = ?)) AND accepted = 1",
               [user[0][0], data["other"], data["other"], user[0][0]]):
        return bad_request("NOT FRIENDS")

    messages = sql("""SELECT MESSAGE.message, USER_COLOUR.user, USER_COLOUR.colour, COLOUR.name FROM MESSAGE 
        JOIN USER_COLOUR ON USER_COLOUR.id = MESSAGE.user_colour
        JOIN COLOUR ON USER_COLOUR.colour = COLOUR.hex
        WHERE (USER_COLOUR.user = ? AND MESSAGE.user = ?) OR (USER_COLOUR.user = ? AND MESSAGE.user = ?)""",
        [user[0][0], data["other"], data["other"], user[0][0]])
    
    _messages = []
    for message in messages:
        _messages.append({"message": message[0], "sent": message[1] == user[0][0], "colour": message[2], "name": message[3]})
    return jsonify({"table": _messages})

@app.route('/pic', methods=['POST'])
# Set a user's picture to a badge image if they have the badge.
def picF():
    data = request.get_json(silent=True)
    if not data or "badge" not in data or "user" not in data:
        return bad_request("Missing fields")

    user_data = data["user"]
    if not isinstance(user_data, dict) or "name" not in user_data or "pas" not in user_data:
        return bad_request("Missing user info")

    uname, pas = user_data["name"], user_data["pas"]

    user = sql("SELECT id FROM USER WHERE username = ? and password = ?", [uname, pas])
    if not user:
        return bad_request("Invalid user credentials")
    
    if badgeTest(data["badge"], user[0][0]):
        path = sql("SELECT path FROM BADGE WHERE id = ?", [data["badge"]])
        sql("UPDATE USER SET pic = ? WHERE id = ?", [path[0][0], user[0][0]])
    return jsonify({})

if __name__ == "__main__":
    app.run(debug=False)