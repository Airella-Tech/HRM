import { Routes, Route } from "react-router-dom";
import Login from "./Pages/login.jsx";
import Hero from "./Pages/hero.jsx";
import CreateAccount from "./Pages/createaccount.jsx";
import Dashboard from "./Pages/dashboard.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Hero />} />
      <Route path="/login" element={<Login />} />
      <Route path="/createaccount" element={<CreateAccount />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}

export default App;
