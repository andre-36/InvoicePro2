import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

document.title = "AluminumManager - Inventory and Sales Management";

createRoot(document.getElementById("root")!).render(<App />);
