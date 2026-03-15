"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { cs, Translations } from "./cs";
import { en } from "./en";
import { sk } from "./sk";
import { pl } from "./pl";
import { de } from "./de";

export type Language = "cs" | "en" | "sk" | "pl" | "de";

interface LanguageContextProps {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: keyof Translations) => string;
}

const dictionaries = { cs, en, sk, pl, de };

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    const [language, setLanguageState] = useState<Language>("cs");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem("investice_lang") as Language;
        if (stored && ["cs", "en", "sk", "pl", "de"].includes(stored)) {
            setLanguageState(stored);
        }
        setMounted(true);
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem("investice_lang", lang);
    };

    const t = (key: keyof Translations): string => {
        return dictionaries[language][key] || key;
    };


    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
};
