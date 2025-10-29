import { createRoot } from "react-dom/client";
import App from "./App";
import "@uppy/core/css/style.css";
import "@uppy/dashboard/css/style.css";
import "./index.css";

document.title = "AluminumManager - Inventory and Sales Management";

createRoot(document.getElementById("root")!).render(<App />);
