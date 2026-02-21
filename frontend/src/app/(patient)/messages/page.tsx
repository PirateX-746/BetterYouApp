"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Messages() {
    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold">Messages</h2>
        </div>
    );
}