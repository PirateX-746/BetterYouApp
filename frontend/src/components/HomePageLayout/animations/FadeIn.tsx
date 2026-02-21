"use client";

import { motion } from "framer-motion";

interface Props {
    children: React.ReactNode;
    delay?: number;
}

export default function FadeIn({ children, delay = 0 }: Props) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay }}
            viewport={{ once: true }}
        >
            {children}
        </motion.div>
    );
}