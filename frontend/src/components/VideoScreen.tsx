import { useCallback, useEffect, useRef, useState } from "react";
import { useSocket } from "../context/ws";
import peer from "./peer";

interface JoinedMessageProps {
  type: string;
  email: string;
  socketId: string;
}
interface IncomingCallProps {
  type: string;
  peerSocketId: string;
  offer: RTCSessionDescription;
}
interface AcceptedCallProps {
  type: string;
  peerSocketId: string;
  answer: RTCSessionDescription;
}

// const VideoScreen = () => {
//   const { socket } = useSocket();
//   const [peerSocketId, setPeerSocketId] = useState("");
//   const [myStream, setMyStream] = useState<MediaStream | null>(null);

//   const myVideoRef = useRef<HTMLVideoElement>(null);

//   const handleIncomingCall=async(data:IncomingCallProps)=>{
//     setPeerSocketId(data.peerSocketId)
//       console.log("this is data of incoming call",data)
//        const stream = await navigator.mediaDevices.getUserMedia({
//         video: true,
//         audio: true,
//       });
//        if (myVideoRef.current) {
//         myVideoRef.current.srcObject = stream;
//       }
//       const answer= await peer.getAnswer(data.offer)
      
//       socket?.send(JSON.stringify({type: "callAccepted",peerSocketId:data.peerSocketId,answer:answer}))

//   }

//   const handleAcceptedCall=useCallback(async(data:AcceptedCallProps)=>{
//       await peer.setLocalDescription(data.answer)
//         console.log("this is answer data ",data)
//   },[])

//   const handleJoinedRoom = useCallback((data: JoinedMessageProps) => {
//     if (!data.email || !data.socketId) return;
//     const { email, socketId } = data;
//     setPeerSocketId(socketId);
//     console.log("this is damn data", email, socketId);
//   }, []);

//   useEffect(() => {
//     if (!socket) return;

//     socket.onmessage = (event: MessageEvent) => {
//       try {
//         const data = JSON.parse(event.data);
//         console.log("Received:", data);

//         if (data.type === "joined") {
//           handleJoinedRoom(data);
//         }

//         if(data.type==="incomingCall"){
//           handleIncomingCall(data)
//         }
//         if(data.type==="callAccepted"){
//           handleAcceptedCall(data)
//         }
//       } catch (err) {
//         console.error("Invalid message from server:", event.data);
//       }
//     };

//     return () => {
//       socket.onmessage = null; // cleanup
//     };
//   }, [socket, handleJoinedRoom]);

//   const handleCall = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: true,
//         audio: true,
//       });
//       setMyStream(stream);

//       if (myVideoRef.current) {
//         myVideoRef.current.srcObject = stream;
//       }
//       const offer=await peer.getOffer()
//       socket?.send(JSON.stringify({type: "call",peerSocketId:peerSocketId,offer:offer}))
//     } catch (error) {
//       console.log("Error accessing media devices:", error);
//     }
//   };

//   return (
//     <div>
//       <div>video screen</div>
//       <div>
//         {peerSocketId ? (
//           <div>
//             <h2>connected</h2>
//             <button onClick={handleCall}>call</button>
//             <video
//               ref={myVideoRef}
//               autoPlay
//               playsInline
//               muted
//               width={200}
//               height={150}
//             />
//           </div>
//         ) : (
//           <div>No one connected</div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default VideoScreen;


const VideoScreen = () => {
  const { socket } = useSocket();
  const [peerSocketId, setPeerSocketId] = useState("");
  const [myStream, setMyStream] = useState<MediaStream | null>(null);

  const myVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const handleIncomingCall = async (data: IncomingCallProps) => {
    setPeerSocketId(data.peerSocketId);
    console.log("Incoming call:", data);

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    setMyStream(stream);

    // show my own video
    if (myVideoRef.current) {
      myVideoRef.current.srcObject = stream;
    }

    // add local stream to peer
    peer.addStream(stream);

    // listen for remote track
    peer.onTrack((event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    });

    const answer = await peer.getAnswer(data.offer);
    socket?.send(
      JSON.stringify({
        type: "callAccepted",
        peerSocketId: data.peerSocketId,
        answer: answer,
      })
    );
  };

  const handleAcceptedCall = useCallback(async (data: AcceptedCallProps) => {
    await peer.setLocalDescription(data.answer);
    console.log("Call accepted:", data);
  }, []);

  const handleJoinedRoom = useCallback((data: JoinedMessageProps) => {
    if (!data.email || !data.socketId) return;
    const { email, socketId } = data;
    setPeerSocketId(socketId);
    console.log("Joined:", email, socketId);
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received:", data);

        if (data.type === "joined") handleJoinedRoom(data);
        if (data.type === "incomingCall") handleIncomingCall(data);
        if (data.type === "callAccepted") handleAcceptedCall(data);
      } catch (err) {
        console.error("Invalid message:", event.data);
      }
    };

    return () => {
      socket.onmessage = null;
    };
  }, [socket, handleJoinedRoom]);

  const handleCall = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    setMyStream(stream);

    if (myVideoRef.current) {
      myVideoRef.current.srcObject = stream;
    }

    // add local stream
    peer.addStream(stream);

    // listen for remote
    peer.onTrack((event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    });

    const offer = await peer.getOffer();
    socket?.send(
      JSON.stringify({ type: "call", peerSocketId: peerSocketId, offer: offer })
    );
  };

  return (
   <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
  <h2 className="text-2xl font-bold text-gray-800 mb-6">Video Call</h2>

  {peerSocketId ? (
    <div className="w-full max-w-4xl bg-white shadow-lg rounded-xl p-6">
      {/* Controls */}
      <div className="flex justify-center mb-4">
        <button
          onClick={handleCall}
          className="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
        >
          Start Call
        </button>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="relative bg-black rounded-lg overflow-hidden shadow">
          <video
            ref={myVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-64 object-cover"
          />
          <span className="absolute bottom-2 left-2 text-sm bg-black/60 text-white px-2 py-1 rounded">
            You
          </span>
        </div>

        <div className="relative bg-black rounded-lg overflow-hidden shadow">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-64 object-cover"
          />
          <span className="absolute bottom-2 left-2 text-sm bg-black/60 text-white px-2 py-1 rounded">
            Remote
          </span>
        </div>
      </div>
    </div>
  ) : (
    <div className="text-gray-500 italic">No one connected</div>
  )}
</div>

  );
};

export default VideoScreen;