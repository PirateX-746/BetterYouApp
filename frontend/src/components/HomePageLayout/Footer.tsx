"use client";

import {
    MapPin,
    Phone,
    Mail,
    Clock,
} from "lucide-react";

export default function Footer() {
    return (
        <footer className="bg-[#0f172a] text-gray-400 border-t border-white/5 scroll-mt-5" id="contact">
            <div className="max-w-7xl mx-auto px-6 py-16">

                {/* Top Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">

                    {/* Brand */}
                    <div>
                        <h2 className="text-2xl font-semibold text-white tracking-tight">
                            Better<span className="text-blue-500">You</span>
                        </h2>
                        <p className="mt-4 text-sm leading-relaxed max-w-sm">
                            A modern integrative clinic focused on personalized care,
                            preventive health, and mental wellness.
                        </p>
                    </div>

                    {/* Contact */}
                    <div className="space-y-4 text-sm">

                        <div className="flex items-start gap-3">
                            <MapPin size={16} className="mt-1 text-blue-400" />
                            <p>
                                402 Wellness Avenue, Prahlad Nagar
                                <br /> Ahmedabad, Gujarat, India
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <Phone size={16} className="text-blue-400" />
                            <p>+91 98765 43210</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <Mail size={16} className="text-blue-400" />
                            <p>contact@betteryourclinic.com</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <Clock size={16} className="text-blue-400" />
                            <p>Mon – Sat · 9AM – 7PM</p>
                        </div>

                    </div>

                    {/* Quick Links */}
                    <div className="text-sm space-y-3">
                        <p className="text-white font-medium mb-4">Quick Links</p>

                        <div className="flex flex-col gap-2">
                            <a href="#" className="hover:text-white transition-colors">
                                About
                            </a>
                            <a href="/patientLogin" className="hover:text-white transition-colors">
                                Book Appointment
                            </a>
                            <a href="/practitionerLogin" className="hover:text-white transition-colors">
                                Practitioner Portal
                            </a>
                            <a href="#" className="hover:text-white transition-colors">
                                Privacy Policy
                            </a>
                        </div>
                    </div>

                </div>

                {/* Bottom */}
                <div className="mt-16 pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500">
                    <p>© {new Date().getFullYear()} BetterYou. All rights reserved.</p>
                    <p className="mt-3 md:mt-0">Designed for modern healthcare</p>
                </div>

            </div>
        </footer>
    );
}