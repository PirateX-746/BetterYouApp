import Image from "next/image";
import styles from "./page.module.css";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-purple-600 flex items-center justify-center">
      <h1 className="text-white text-4xl font-bold">
        Tailwind JS Config Works 🎯
      </h1>
    </div>
  );
}
