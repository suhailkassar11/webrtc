package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

// ------------------- Structs -------------------

type JoinRoomMessage struct {
	Type  string `json:"type"` // "join"
	Email string `json:"email"`
	Room  string `json:"room"`
}

type JoinedRoomMessage struct {
	Type     string `json:"type"` // "joined"
	Email    string `json:"email"`
	SocketId string `json:"socketId"`
}

type SessionDescription struct {
	Type string `json:"type"` // "offer" or "answer"
	SDP  string `json:"sdp"`
}

type IncomingCall struct {
	Type         string             `json:"type"`         // "call"
	PeerSocketId string             `json:"peerSocketId"` // target socket
	Offer        SessionDescription `json:"offer"`
}
type CallAccepted struct {
	Type         string             `json:"type"`         // "call"
	PeerSocketId string             `json:"peerSocketId"` // target socket
	Answer       SessionDescription `json:"answer"`
}

// ------------------- Globals -------------------

var (
	emailToConn = make(map[string]*websocket.Conn)            // email → conn
	connToEmail = make(map[*websocket.Conn]string)            // conn → email
	roomToUsers = make(map[string]map[string]*websocket.Conn) // room → {email → conn}
	connToID    = make(map[*websocket.Conn]string)            // conn → socketId
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// ------------------- Signalling -------------------

func signalling(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Upgrade error:", err)
		return
	}

	socketId := uuid.NewString()
	connToID[conn] = socketId

	defer func() {
		// Cleanup on disconnect
		conn.Close()
		email := connToEmail[conn]
		delete(connToID, conn)
		delete(connToEmail, conn)
		delete(emailToConn, email)

		for _, users := range roomToUsers {
			for e, c := range users {
				if c == conn {
					delete(users, e)
				}
			}
		}

		log.Printf("⚡ Connection closed: %s", email)
	}()

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			log.Println("Read error:", err)
			break
		}

		// Try parsing join message first
		var joinMsg JoinRoomMessage
		if err := json.Unmarshal(msg, &joinMsg); err == nil && joinMsg.Type == "join" {
			handleJoin(conn, joinMsg)
			continue
		}

		// Try parsing call message
		var callMsg IncomingCall
		if err := json.Unmarshal(msg, &callMsg); err == nil && callMsg.Type == "call" {
			handleCall(conn, callMsg)
			continue
		}
		var acceptMsg CallAccepted
		if err := json.Unmarshal(msg, &acceptMsg); err == nil && acceptMsg.Type == "callAccepted" {
			handleCallAccept(conn, acceptMsg)
			continue
		}

		log.Println("Unknown message type or JSON parse failed:", string(msg))
	}
}

// ------------------- Handlers -------------------

func handleJoin(conn *websocket.Conn, joinMsg JoinRoomMessage) {
	fmt.Printf("%s wants to join room %s\n", joinMsg.Email, joinMsg.Room)

	emailToConn[joinMsg.Email] = conn
	connToEmail[conn] = joinMsg.Email

	// Add to room mapping
	if _, ok := roomToUsers[joinMsg.Room]; !ok {
		roomToUsers[joinMsg.Room] = make(map[string]*websocket.Conn)
	}

	// Broadcast "joined" to other users in the room
	notify := JoinedRoomMessage{
		Type:     "joined",
		Email:    joinMsg.Email,
		SocketId: connToID[conn],
	}
	notifyBytes, _ := json.Marshal(notify)

	for email, c := range roomToUsers[joinMsg.Room] {
		if email == joinMsg.Email {
			continue
		}
		if err := c.WriteMessage(websocket.TextMessage, notifyBytes); err != nil {
			log.Println("Broadcast error:", err)
			c.Close()
			delete(roomToUsers[joinMsg.Room], email)
		}
	}

	// Add current user to room
	roomToUsers[joinMsg.Room][joinMsg.Email] = conn

	// Confirm join to self
	respBytes, _ := json.Marshal(joinMsg)
	if err := conn.WriteMessage(websocket.TextMessage, respBytes); err != nil {
		log.Println("Write error:", err)
	}
}

func handleCall(conn *websocket.Conn, callMsg IncomingCall) {
	fmt.Printf("📞 Incoming call from %s to %s\n", connToID[conn], callMsg.PeerSocketId)

	// Find target connection
	var targetConn *websocket.Conn
	for c, id := range connToID {
		if id == callMsg.PeerSocketId {
			targetConn = c
			break
		}
	}

	if targetConn != nil {
		// Forward the offer
		response := IncomingCall{
			Type:         "incomingCall",
			PeerSocketId: connToID[conn], // sender's socketId
			Offer:        callMsg.Offer,
		}
		respBytes, _ := json.Marshal(response)

		if err := targetConn.WriteMessage(websocket.TextMessage, respBytes); err != nil {
			log.Println("Forward error:", err)
			targetConn.Close()
		}
	} else {
		log.Println("Target socket not found:", callMsg.PeerSocketId)
	}
}
func handleCallAccept(conn *websocket.Conn, acceptMsg CallAccepted) {
	fmt.Printf("📞 Incoming call from %s to %s\n", connToID[conn], acceptMsg.PeerSocketId)

	// Find target connection
	var targetConn *websocket.Conn
	for c, id := range connToID {
		if id == acceptMsg.PeerSocketId {
			targetConn = c
			break
		}
	}

	if targetConn != nil {
		// Forward the offer
		response := CallAccepted{
			Type:         "callAccepted",
			PeerSocketId: connToID[conn], // sender's socketId
			Answer:       acceptMsg.Answer,
		}
		respBytes, _ := json.Marshal(response)

		if err := targetConn.WriteMessage(websocket.TextMessage, respBytes); err != nil {
			log.Println("Forward error:", err)
			targetConn.Close()
		}
	} else {
		log.Println("Target socket not found:", acceptMsg.PeerSocketId)
	}
}

func main() {
	http.HandleFunc("/ws", signalling)
	fmt.Println("🚀 Server running on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
