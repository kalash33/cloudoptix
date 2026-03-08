"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, User, Bot, Loader2 } from "lucide-react";
import { chatApi } from "@/lib/api";

type Message = {
    id: string;
    role: "user" | "assistant";
    content: string;
};

export function ChatBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            role: "assistant",
            content: "Hi! I'm CloudOptix AI. How can I help you optimize your cloud infrastructure today?",
        },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input.trim(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        try {
            // Format history for the API
            const history = messages.map((m) => ({
                role: m.role,
                content: m.content,
            }));

            const res = await chatApi.sendMessage(userMsg.content, history);

            if (res.data) {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: (Date.now() + 1).toString(),
                        role: "assistant",
                        content: res.data.reply,
                    },
                ]);
            }
        } catch (error) {
            console.error("Chat error:", error);
            setMessages((prev) => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    role: "assistant",
                    content: "Sorry, I had trouble reaching the cloud context. Please try again.",
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Simple markdown renderer for bolding and line breaks
    const renderMessageContent = (content: string) => {
        return content.split('\n').map((line, i) => (
            <span key={i}>
                {line.split(/(\*\*.*?\*\*)/).map((part, j) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={j} className="text-primary-400">{part.slice(2, -2)}</strong>;
                    }
                    return part;
                })}
                <br />
            </span>
        ));
    };

    return (
        <>
            {/* Floating Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 p-4 rounded-full shadow-lg shadow-primary-500/20 z-50 transition-all duration-300 ${isOpen ? "bg-secondary scale-90 rotate-90 opacity-0 pointer-events-none" : "bg-primary hover:scale-105 active:scale-95"
                    }`}
            >
                <MessageSquare className="w-6 h-6 text-white" />
            </button>

            {/* Chat Window */}
            <div
                className={`fixed bottom-6 right-6 w-96 h-[600px] max-h-[80vh] flex flex-col bg-card border border-border shadow-2xl rounded-2xl z-[100] transition-all duration-300 origin-bottom-right overflow-hidden ${isOpen ? "scale-100 opacity-100" : "scale-50 opacity-0 pointer-events-none"
                    }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <Bot className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground">CloudOptix AI</h3>
                            <p className="text-xs text-muted-foreground">Context-Aware Assistant</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 -mr-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Message History */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                        >
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-secondary" : "bg-primary/20"
                                    }`}
                            >
                                {msg.role === "user" ? (
                                    <User className="w-4 h-4 text-secondary-foreground" />
                                ) : (
                                    <Bot className="w-4 h-4 text-primary" />
                                )}
                            </div>
                            <div
                                className={`max-w-[75%] rounded-2xl px-4 py-2 ${msg.role === "user"
                                    ? "bg-secondary text-secondary-foreground rounded-tr-sm"
                                    : "bg-background border border-border text-foreground rounded-tl-sm"
                                    }`}
                            >
                                <div className="text-sm font-light leading-relaxed">
                                    {renderMessageContent(msg.content)}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Typing Indicator */}
                    {isLoading && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                <Bot className="w-4 h-4 text-primary" />
                            </div>
                            <div className="bg-background border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions (Only show if no user messages yet) */}
                {messages.length === 1 && (
                    <div className="p-4 pt-0 flex gap-2 overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => { setInput("What are my top cost drivers?"); handleSend(); }}
                            className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors whitespace-nowrap"
                        >
                            Top cost drivers
                        </button>
                        <button
                            onClick={() => { setInput("Where can I save money?"); handleSend(); }}
                            className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors whitespace-nowrap"
                        >
                            Find savings
                        </button>
                    </div>
                )}

                {/* Input Area */}
                <div className="p-4 border-t border-border bg-card rounded-b-xl">
                    <div className="relative flex items-center">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder="Ask about your infrastructure..."
                            className="w-full bg-secondary border border-border rounded-xl pl-4 pr-12 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none h-12"
                            rows={1}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className="absolute right-2 p-1.5 rounded-lg text-muted-foreground hover:text-primary disabled:opacity-50 disabled:hover:text-muted-foreground transition-colors"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
