import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

document.title = "InvoiceHub - Modern Invoicing Platform";

createRoot(document.getElementById("root")!).render(<App />);
