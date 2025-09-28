import { Route, Routes } from "react-router-dom"
import LobbyScreen from "./components/LobbyScreen"
import VideoScreen from "./components/VideoScreen"

function App() {


  return (
   <Routes>
    <Route path="/" element={<LobbyScreen/>} />
    <Route path="/room/:roomId" element={<VideoScreen/>}/>
   </Routes>
  )
}

export default App
