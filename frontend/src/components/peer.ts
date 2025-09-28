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
