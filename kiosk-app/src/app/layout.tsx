import type { Metadata } from "next";
import type { ReactNode } from "react";
import FloatingVoiceInput from "../components/FloatingVoiceInput";
import "./globals.css";

export const metadata: Metadata = {
  title: "医院一体机智能助手",
  description: "SmartHospitalAssistant MVP",
};

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        {props.children}
        <FloatingVoiceInput />
      </body>
    </html>
  );
}

