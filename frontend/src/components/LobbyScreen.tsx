import { useCallback, useEffect, useState } from "react";
import { useSocket } from "../context/ws";
import { useNavigate } from "react-router-dom";

interface JoinMessageProps{
    Type: string;
    email:string;
    room:string;
}


const LobbyScreen = () => {

    const [email, setEmail] = useState("")
    const [room, setRoom] = useState("")
    const { socket } = useSocket()
    const navigate = useNavigate()

    const handleClick = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        socket?.send(JSON.stringify({ type: "join", email: email, room: room }))
    }, [email, room, socket])


    const handleJoinRoom = useCallback((data:JoinMessageProps) => {
        if (!data.email || !data.room) return;
        const {email,room}=data;
        console.log("this is damn data",email,room)
        navigate(`room/${room}`)
    }, [])

    useEffect(() => {
        if (!socket) return;

        socket.onmessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);
                console.log("Received:", data);

                if (data.type === "join") {
                    handleJoinRoom(data);
                }
            } catch (err) {
                console.error("Invalid message from server:", event.data);
            }
        };

        return () => {
            socket.onmessage = null; // cleanup
        };
    }, [socket, handleJoinRoom]);

    return (
        <div className="flex justify-center items-center h-screen bg-gray-100">
            <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md">
                <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
                    Join a Room
                </h1>

                <form typeof="submit" onSubmit={handleClick} className="flex flex-col gap-4">
                    <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                        placeholder="Enter your email"
                        className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <input
                        value={room}
                        onChange={(e) => setRoom(e.target.value)}
                        type="text"
                        placeholder="Enter room ID"
                        className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <button
                        type="submit"

                        className="bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition-colors font-semibold"
                    >
                        Join Room
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LobbyScreen;


