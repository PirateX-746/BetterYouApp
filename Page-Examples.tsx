// Option-1
// "use client";

// import Link from "next/link";
// import { Stethoscope, User } from "lucide-react";

// export default function Home() {
//   return (
//     <div className="max-h-screen bg-gradient-to-br from-indigo-600 via-cyan-600 to-blue-600 flex items-center justify-center px-4 py-10">

//       <div className="w-full max-w-6xl backdrop-blur-xl rounded-3xl p-8 md:p-14">

//         {/* Header */}
//         <div className="text-center mb-14">
//           <h1 className="text-4xl md:text-5xl font-bold text-white">
//             Welcome to <span className="text-white">BetterYou</span>
//           </h1>
//           <p className="mt-4 text-white text-lg">
//             Choose your portal to continue
//           </p>
//         </div>

//         {/* Cards */}
//         <div className="grid md:grid-cols-2 gap-10">

//           {/* Practitioner */}
//           <div className="group bg-white border border-gray-200 rounded-2xl p-10 shadow-md hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col">

//             <div className="flex justify-center mb-6">
//               <div className="bg-indigo-100 text-indigo-600 p-5 rounded-2xl group-hover:scale-110 transition">
//                 <Stethoscope size={40} />
//               </div>
//             </div>

//             <h2 className="text-2xl font-semibold text-center text-gray-900">
//               Healthcare Practitioner
//             </h2>

//             <p className="text-gray-500 text-center mt-3">
//               Manage patients, appointments, prescriptions and lab results.
//             </p>

//             <ul className="mt-8 space-y-3 text-gray-600 text-sm">
//               <li>✔ Manage patient records</li>
//               <li>✔ Schedule appointments</li>
//               <li>✔ Write prescriptions</li>
//               <li>✔ View lab reports</li>
//             </ul>

//             <Link
//               href="/practitioner/login"
//               className="mt-auto"
//             >
//               <div className="w-full mt-10 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl text-center shadow-lg transition">
//                 Login as Practitioner
//               </div>
//             </Link>

//           </div>

//           {/* Patient */}
//           <div className="group bg-white border border-gray-200 rounded-2xl p-10 shadow-md hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col">

//             <div className="flex justify-center mb-6">
//               <div className="bg-cyan-100 text-cyan-600 p-5 rounded-2xl group-hover:scale-110 transition">
//                 <User size={40} />
//               </div>
//             </div>

//             <h2 className="text-2xl font-semibold text-center text-gray-900">
//               Patient
//             </h2>

//             <p className="text-gray-500 text-center mt-3">
//               View records, book appointments and access prescriptions.
//             </p>

//             <ul className="mt-8 space-y-3 text-gray-600 text-sm">
//               <li>✔ View medical history</li>
//               <li>✔ Book appointments</li>
//               <li>✔ Access prescriptions</li>
//               <li>✔ Check lab reports</li>
//             </ul>

//             <Link
//               href="/patient/login"
//               className="mt-auto"
//             >
//               <div className="w-full mt-10 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 rounded-xl text-center shadow-lg transition">
//                 Login as Patient
//               </div>
//             </Link>

//           </div>

//         </div>

//         {/* Footer */}
//         <div className="mt-16 text-center text-sm text-white">
//           © 2026 BetterYou. All rights reserved.
//         </div>

//       </div>
//     </div>
//   );
// }


//Option-2

// "use client";

// import Link from "next/link";

// export default function Home() {
//   return (
//     <main className="bg-[var(--bg-page)] text-[var(--text-primary)]">

//       {/* ================= NAVBAR ================= */}
//       <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[var(--border)]">
//         <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
//           <h1 className="text-xl font-semibold text-[var(--primary)]">
//             BetterYou
//           </h1>

//           <nav className="hidden md:flex gap-8 text-sm text-[var(--text-secondary)]">
//             <Link href="#about">About</Link>
//             <Link href="#services">Services</Link>
//             <Link href="#how">How it Works</Link>
//             <Link href="#contact">Contact</Link>
//           </nav>

//           <button className="bg-[var(--danger)] text-white px-4 py-2 rounded-lg text-sm">
//             Crisis Help
//           </button>
//         </div>
//       </header>

//       {/* ================= HERO ================= */}
//       <section className="relative overflow-hidden">
//         <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary-light)] via-white to-[var(--blue-light)] opacity-80" />

//         <div className="relative max-w-7xl mx-auto px-6 py-24 grid md:grid-cols-2 items-center gap-12">

//           <div>
//             <h2 className="text-4xl md:text-5xl font-semibold leading-tight">
//               Your Journey to <br />
//               <span className="text-[var(--primary)]">
//                 Better Mental Health
//               </span>{" "}
//               Begins Here
//             </h2>

//             <p className="mt-6 text-[var(--text-secondary)] leading-relaxed">
//               BetterYou connects patients with licensed practitioners through
//               a secure digital portal. Book sessions, access resources, and
//               manage your wellness journey — all in one place.
//             </p>

//             <div className="mt-8 flex gap-4">
//               <Link
//                 href="/register"
//                 className="bg-[var(--primary)] text-white px-6 py-3 rounded-lg shadow-md hover:bg-[var(--primary-hover)]"
//               >
//                 Take the First Step
//               </Link>

//               <Link
//                 href="#services"
//                 className="border border-[var(--primary)] text-[var(--primary)] px-6 py-3 rounded-lg"
//               >
//                 Learn More
//               </Link>
//             </div>
//           </div>

//           <div className="relative">
//             <img
//               src="https://images.unsplash.com/photo-1551836022-d5d88e9218df"
//               alt="Doctor consultation"
//               className="rounded-2xl shadow-lg"
//             />
//           </div>

//         </div>
//       </section>

//       {/* ================= SAFE SPACE SECTION ================= */}
//       <section id="about" className="py-24 bg-white">
//         <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">

//           <img
//             src="https://images.unsplash.com/photo-1584515933487-779824d29309"
//             alt="Therapy support"
//             className="rounded-2xl shadow-md"
//           />

//           <div>
//             <h3 className="text-3xl font-semibold">
//               A Safe Digital Space for You
//             </h3>

//             <p className="mt-6 text-[var(--text-secondary)] leading-relaxed">
//               We provide a secure, judgment-free environment where patients can
//               connect with qualified doctors and therapists. Your privacy,
//               comfort, and well-being are always our priority.
//             </p>

//             <Link
//               href="/register"
//               className="inline-block mt-8 bg-[var(--primary)] text-white px-6 py-3 rounded-lg"
//             >
//               Get Started
//             </Link>
//           </div>

//         </div>
//       </section>

//       {/* ================= HOW IT WORKS ================= */}
//       <section id="how" className="py-24 bg-[var(--bg-light)]">
//         <div className="max-w-5xl mx-auto px-6 text-center">
//           <h3 className="text-3xl font-semibold mb-16">
//             How BetterYou Works
//           </h3>

//           <div className="space-y-10 text-left">

//             <div className="bg-white p-6 rounded-xl shadow-sm border border-[var(--border)]">
//               <h4 className="font-semibold text-[var(--primary)]">
//                 1. Create Your Profile
//               </h4>
//               <p className="mt-2 text-sm text-[var(--text-secondary)]">
//                 Sign up securely and tell us about your needs and preferences.
//               </p>
//             </div>

//             <div className="bg-white p-6 rounded-xl shadow-sm border border-[var(--border)]">
//               <h4 className="font-semibold text-[var(--primary)]">
//                 2. Book a Session
//               </h4>
//               <p className="mt-2 text-sm text-[var(--text-secondary)]">
//                 Choose from licensed practitioners and schedule appointments
//                 seamlessly.
//               </p>
//             </div>

//             <div className="bg-white p-6 rounded-xl shadow-sm border border-[var(--border)]">
//               <h4 className="font-semibold text-[var(--primary)]">
//                 3. Begin Your Wellness Journey
//               </h4>
//               <p className="mt-2 text-sm text-[var(--text-secondary)]">
//                 Attend sessions, access resources, and track your progress
//                 through our secure portal.
//               </p>
//             </div>

//           </div>
//         </div>
//       </section>

//       {/* ================= SESSION FEES ================= */}
//       <section id="services" className="py-24 bg-white">
//         <div className="max-w-6xl mx-auto px-6 text-center">
//           <h3 className="text-3xl font-semibold mb-16">
//             Consultation Plans
//           </h3>

//           <div className="grid md:grid-cols-3 gap-8">

//             <div className="bg-[var(--primary-light)] p-8 rounded-2xl">
//               <h4 className="font-semibold text-lg">First Consultation</h4>
//               <p className="mt-4 text-[var(--text-secondary)]">
//                 Initial assessment and personalized care plan.
//               </p>
//               <p className="mt-6 text-2xl font-bold text-[var(--primary)]">
//                 ₹999
//               </p>
//             </div>

//             <div className="bg-[var(--primary)] text-white p-8 rounded-2xl shadow-lg">
//               <h4 className="font-semibold text-lg">
//                 Follow-Up Sessions
//               </h4>
//               <p className="mt-4 opacity-90">
//                 Ongoing therapy and progress tracking.
//               </p>
//               <p className="mt-6 text-2xl font-bold">
//                 ₹799
//               </p>
//             </div>

//             <div className="bg-[var(--primary-light)] p-8 rounded-2xl">
//               <h4 className="font-semibold text-lg">
//                 Comprehensive Plan
//               </h4>
//               <p className="mt-4 text-[var(--text-secondary)]">
//                 Long-term support and premium wellness tools.
//               </p>
//               <p className="mt-6 text-2xl font-bold text-[var(--primary)]">
//                 ₹2999
//               </p>
//             </div>

//           </div>
//         </div>
//       </section>

//       {/* ================= FINAL CTA ================= */}
//       <section className="py-24 bg-gradient-to-r from-[var(--primary)] to-[var(--blue-dark)] text-white text-center">
//         <div className="max-w-3xl mx-auto px-6">
//           <h3 className="text-3xl font-semibold">
//             Ready to Take the First Step?
//           </h3>

//           <p className="mt-4 opacity-90">
//             Join BetterYou and start your journey toward better mental health
//             with trusted professionals.
//           </p>

//           <Link
//             href="/register"
//             className="inline-block mt-8 bg-white text-[var(--primary)] px-8 py-3 rounded-lg font-medium"
//           >
//             Create Your Account
//           </Link>
//         </div>
//       </section>

//       {/* ================= FOOTER ================= */}
//       <footer className="bg-[var(--slate-dark)] text-white py-12 text-sm">
//         <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-8">

//           <div>
//             <h4 className="font-semibold">BetterYou</h4>
//             <p className="mt-2 opacity-70">
//               A secure digital health platform connecting patients and
//               practitioners.
//             </p>
//           </div>

//           <div>
//             <Link href="#" className="block">Privacy Policy</Link>
//             <Link href="#" className="block mt-2">Terms of Service</Link>
//           </div>

//           <div className="opacity-60 text-xs">
//             BetterYou is not a crisis service. If you are experiencing an
//             emergency, contact your local emergency number immediately.
//           </div>

//         </div>
//       </footer>

//     </main>
//   );
// }

//Option-3
// "use client";

// import Link from "next/link";

// export default function Home() {
//   return (
//     <main className="bg-[var(--bg-page)] text-[var(--text-primary)] overflow-hidden">

//       {/* ================= NAVBAR ================= */}
//       <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-[var(--border)]">
//         <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
//           <h1 className="text-xl font-semibold tracking-wide text-[var(--primary)]">
//             BetterYou
//           </h1>

//           <nav className="hidden md:flex gap-10 text-sm text-[var(--text-secondary)]">
//             <Link href="#about">About</Link>
//             <Link href="#services">Services</Link>
//             <Link href="#process">How It Works</Link>
//             <Link href="#contact">Contact</Link>
//           </nav>

//           <button className="bg-[var(--danger)] text-white px-4 py-2 rounded-full text-sm shadow-md">
//             Crisis Help
//           </button>
//         </div>
//       </header>

//       {/* ================= HERO ================= */}
//       <section className="relative py-28">
//         <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary-light)] via-white to-[var(--blue-light)] opacity-70" />

//         <div className="relative max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">

//           {/* LEFT CONTENT */}
//           <div>
//             <span className="inline-block bg-[var(--primary-light)] text-[var(--primary)] px-4 py-1 rounded-full text-xs mb-6">
//               Trusted by 100+ Patients
//             </span>

//             <h2 className="text-5xl leading-tight font-semibold">
//               Your Journey to
//               <span className="text-[var(--primary)]"> Better Care</span>
//               <br />
//               Begins Here
//             </h2>

//             <p className="mt-6 text-[var(--text-secondary)] text-lg leading-relaxed max-w-lg">
//               A secure digital platform connecting patients with licensed
//               practitioners. Book sessions, manage records, and receive care —
//               all in one seamless portal.
//             </p>

//             <div className="mt-10 flex gap-5">
//               <Link
//                 href="/register"
//                 className="bg-[var(--primary)] text-white px-8 py-3 rounded-full shadow-lg hover:bg-[var(--primary-hover)] transition"
//               >
//                 Take the First Step
//               </Link>

//               <Link
//                 href="#about"
//                 className="border border-[var(--primary)] text-[var(--primary)] px-8 py-3 rounded-full"
//               >
//                 Learn More
//               </Link>
//             </div>
//           </div>

//           {/* RIGHT IMAGE BLOCK */}
//           <div className="relative">
//             <div className="rounded-[40px] overflow-hidden shadow-2xl">
//               <img
//                 src="https://images.unsplash.com/photo-1573497620053-ea5300f94f21"
//                 alt="Doctor"
//                 className="w-full object-cover"
//               />
//             </div>

//             {/* Floating Stats */}
//             <div className="absolute -top-6 -right-6 bg-white shadow-xl rounded-2xl px-6 py-4 text-center">
//               <p className="text-2xl font-bold text-[var(--primary)]">8+</p>
//               <p className="text-xs text-[var(--text-secondary)]">
//                 Years Experience
//               </p>
//             </div>

//             <div className="absolute -bottom-6 -left-6 bg-white shadow-xl rounded-2xl px-6 py-4 text-center">
//               <p className="text-2xl font-bold text-[var(--primary)]">100+</p>
//               <p className="text-xs text-[var(--text-secondary)]">
//                 Happy Patients
//               </p>
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* ================= SAFE SPACE ================= */}
//       <section id="about" className="py-28 bg-white">
//         <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-20 items-center">

//           <div>
//             <h3 className="text-4xl font-semibold leading-snug">
//               A Safe Space to <span className="text-[var(--primary)]">Be Yourself</span>
//             </h3>

//             <p className="mt-6 text-[var(--text-secondary)] leading-relaxed">
//               BetterYou removes barriers to care. Our platform ensures privacy,
//               security, and a comfortable experience — empowering patients to
//               seek help with confidence.
//             </p>

//             <Link
//               href="/register"
//               className="inline-block mt-8 bg-[var(--primary)] text-white px-7 py-3 rounded-full shadow-md"
//             >
//               Get Started
//             </Link>
//           </div>

//           <div className="rounded-[40px] overflow-hidden shadow-xl">
//             <img
//               src="https://images.unsplash.com/photo-1584515933487-779824d29309"
//               alt="Therapy"
//               className="w-full"
//             />
//           </div>

//         </div>
//       </section>

//       {/* ================= PROCESS TIMELINE ================= */}
//       <section id="process" className="py-28 bg-[var(--bg-light)]">
//         <div className="max-w-4xl mx-auto px-6 text-center">
//           <h3 className="text-4xl font-semibold mb-20">
//             How It Works
//           </h3>

//           <div className="space-y-16 text-left border-l-2 border-[var(--primary)] pl-10">

//             <div>
//               <h4 className="text-lg font-semibold text-[var(--primary)]">
//                 Reach Out
//               </h4>
//               <p className="text-[var(--text-secondary)] mt-2">
//                 Create your profile and describe your needs.
//               </p>
//             </div>

//             <div>
//               <h4 className="text-lg font-semibold text-[var(--primary)]">
//                 Book Session
//               </h4>
//               <p className="text-[var(--text-secondary)] mt-2">
//                 Choose a licensed practitioner and schedule securely.
//               </p>
//             </div>

//             <div>
//               <h4 className="text-lg font-semibold text-[var(--primary)]">
//                 Ongoing Care
//               </h4>
//               <p className="text-[var(--text-secondary)] mt-2">
//                 Attend sessions, manage documents, and track progress.
//               </p>
//             </div>

//           </div>
//         </div>
//       </section>

//       {/* ================= DARK CTA BAND ================= */}
//       <section className="py-24 bg-gradient-to-r from-[var(--primary)] to-[var(--blue-dark)] text-white text-center">
//         <div className="max-w-3xl mx-auto px-6">
//           <h3 className="text-3xl font-semibold">
//             Let’s Find the Right Care for You
//           </h3>

//           <Link
//             href="/register"
//             className="inline-block mt-8 bg-white text-[var(--primary)] px-8 py-3 rounded-full font-medium"
//           >
//             Take the Quiz
//           </Link>
//         </div>
//       </section>

//       {/* ================= PRICING ================= */}
//       <section id="services" className="py-28 bg-white">
//         <div className="max-w-6xl mx-auto px-6 text-center">
//           <h3 className="text-4xl font-semibold mb-16">
//             Session Fees
//           </h3>

//           <div className="grid md:grid-cols-3 gap-10">

//             <div className="bg-[var(--primary-light)] p-10 rounded-3xl">
//               <h4 className="text-xl font-semibold">First Consultation</h4>
//               <p className="mt-4 text-[var(--text-secondary)]">
//                 Initial evaluation & personalized plan.
//               </p>
//               <p className="mt-8 text-3xl font-bold text-[var(--primary)]">
//                 ₹999
//               </p>
//             </div>

//             <div className="bg-[var(--primary)] text-white p-10 rounded-3xl shadow-2xl scale-105">
//               <h4 className="text-xl font-semibold">Follow-Up Sessions</h4>
//               <p className="mt-4 opacity-90">
//                 Continued therapy & support.
//               </p>
//               <p className="mt-8 text-3xl font-bold">₹799</p>
//             </div>

//             <div className="bg-[var(--primary-light)] p-10 rounded-3xl">
//               <h4 className="text-xl font-semibold">Comprehensive Plan</h4>
//               <p className="mt-4 text-[var(--text-secondary)]">
//                 Long-term wellness program.
//               </p>
//               <p className="mt-8 text-3xl font-bold text-[var(--primary)]">
//                 ₹2999
//               </p>
//             </div>

//           </div>
//         </div>
//       </section>

//       {/* ================= CONTACT SECTION ================= */}
//       <section id="contact" className="py-28 bg-[var(--bg-light)] text-center">
//         <div className="max-w-xl mx-auto px-6">
//           <h3 className="text-4xl font-semibold">
//             Any Questions?
//           </h3>

//           <p className="mt-4 text-[var(--text-secondary)]">
//             We’re here to support you.
//           </p>

//           <div className="mt-10 space-y-4">
//             <input
//               placeholder="Your Name"
//               className="w-full px-5 py-3 rounded-full border border-[var(--border)]"
//             />
//             <input
//               placeholder="Email Address"
//               className="w-full px-5 py-3 rounded-full border border-[var(--border)]"
//             />
//             <button className="w-full bg-[var(--primary)] text-white py-3 rounded-full">
//               Send Message
//             </button>
//           </div>
//         </div>
//       </section>

//       {/* ================= FOOTER ================= */}
//       <footer className="bg-[var(--slate-dark)] text-white py-14 text-sm">
//         <div className="max-w-6xl mx-auto px-6 flex justify-between">
//           <div>
//             <h4 className="font-semibold">BetterYou</h4>
//             <p className="opacity-70 mt-2 max-w-sm">
//               Secure digital healthcare platform connecting patients and
//               licensed practitioners.
//             </p>
//           </div>

//           <div className="opacity-60 text-xs max-w-xs">
//             BetterYou is not a crisis service. If you are experiencing an
//             emergency, contact your local emergency number immediately.
//           </div>
//         </div>
//       </footer>

//     </main>
//   );
// }