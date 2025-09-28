// class PeerService{
//     peer!:RTCPeerConnection;
//     constructor(){
//         if(!this.peer){
//             this.peer=new RTCPeerConnection({
//                 iceServers:[{
//                     urls:[
//                         "stun:stun.l.google.com:19302",

//                     ]
//                 }]
//             })
//         }
//     }

//     async getAnswer(offer:RTCSessionDescriptionInit){
//         if(offer.sdp){
//            console.log("this is offers sdp",offer.sdp)
//         }
//         if(this.peer){
//             await this.peer.setRemoteDescription(new RTCSessionDescription(offer));
//             const ans=await this.peer.createAnswer()
//             await this.peer.setLocalDescription(new RTCSessionDescription(ans))
//             console.log("this is ans sdp",ans.sdp)
//             console.log("this is ans type",ans.type)
//             return ans;
//         }
//     }

//     async getOffer(){
//         if(this.peer){
//             const offer=await this.peer.createOffer()
//             await this.peer.setLocalDescription(new RTCSessionDescription(offer))
//             return offer
//         }
//     }

//     async setLocalDescription(ans:any){
//         if(this.peer){
//             await this.peer.setRemoteDescription(new RTCSessionDescription(ans))
//         }
//     }
// }

// export default new PeerService

class PeerService {
  peer: RTCPeerConnection;

  constructor() {
    this.peer = new RTCPeerConnection({
      iceServers: [
        {
          urls: ["stun:stun.l.google.com:19302"],
        },
      ],
    });
  }

  // Attach local stream
  addStream(stream: MediaStream) {
    stream.getTracks().forEach(track => {
      this.peer.addTrack(track, stream);
    });
  }

  // Listen for remote track
  onTrack(callback: (event: RTCTrackEvent) => void) {
    this.peer.ontrack = callback;
  }

  async getOffer() {
    const offer = await this.peer.createOffer();
    await this.peer.setLocalDescription(new RTCSessionDescription(offer));
    return { type: offer.type, sdp: offer.sdp };
  }

  async getAnswer(offer: RTCSessionDescriptionInit) {
    await this.peer.setRemoteDescription(new RTCSessionDescription(offer));
    const ans = await this.peer.createAnswer();
    await this.peer.setLocalDescription(new RTCSessionDescription(ans));
    return { type: ans.type, sdp: ans.sdp };
  }

  async setLocalDescription(ans: RTCSessionDescriptionInit) {
    await this.peer.setRemoteDescription(new RTCSessionDescription(ans));
  }
}

export default new PeerService();
