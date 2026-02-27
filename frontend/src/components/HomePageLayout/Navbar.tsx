"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";

export default function Navbar() {
    const [open, setOpen] = useState(false);

    const handleClose = () => setOpen(false);

    return (
        <div className="sticky top-4 z-50 flex justify-center">
            <div className="w-[95%] max-w-[1200px] bg-white border border-blue-100/50 rounded-[24px] shadow-[0_15px_40px_rgba(15,23,42,0.12)] px-8 py-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-lg font-semibold">
                        Better<span className="text-blue-500">You</span>
                    </h1>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex gap-8 text-sm text-gray-600">
                        <a href="#hero" className="hover:text-blue-500 transition">
                            Home
                        </a>
                        <a href="#about" className="hover:text-blue-500 transition">
                            About
                        </a>
                        <a href="#services" className="hover:text-blue-500 transition">
                            Services
                        </a>
                        <a href="#how-we-work" className="hover:text-blue-500 transition">
                            How we work?
                        </a>
                        <a href="#contact" className="hover:text-blue-500 transition">
                            Contact
                        </a>
                    </div>

                    {/* Desktop Button */}
                    <Link
                        href="/patientLogin"
                        className="hidden md:inline-block bg-blue-500 text-white px-5 py-2 rounded-full text-sm hover:scale-105 transition"
                    >
                        Book Appointment
                    </Link>

                    {/* Mobile Toggle */}
                    <button
                        onClick={() => setOpen(!open)}
                        className="md:hidden text-gray-700"
                    >
                        {open ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {open && (
                    <div className="mt-4 md:hidden flex flex-col gap-4 text-gray-700">
                        <a href="#hero" onClick={handleClose}>
                            Home
                        </a>
                        <a href="#about" onClick={handleClose}>
                            About
                        </a>
                        <a href="#services" onClick={handleClose}>
                            Services
                        </a>
                        <a href="#how-we-work" onClick={handleClose}>
                            How we work?
                        </a>
                        <a href="#contact" onClick={handleClose}>
                            Contact
                        </a>

                        <Link
                            href="/patientLogin"
                            onClick={handleClose}
                            className="bg-blue-500 text-white py-2 rounded-full text-center"
                        >
                            Book Appointment
                        </Link>
                    </div>
                )}
            </div>
        </div >
    );
}