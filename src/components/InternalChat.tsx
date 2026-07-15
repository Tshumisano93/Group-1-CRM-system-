import React, { useState, useEffect, useRef } from "react";
import { 
  getChatRooms, 
  saveChatRooms, 
  getChatMessages, 
  saveChatMessages, 
  getUsers,
  addAuditLog 
} from "../db";
import { User, ChatRoom, ChatMessage, UserRole } from "../types";
import { 
  Search, 
  Send, 
  Pin, 
  Archive, 
  MessageSquare, 
  Megaphone, 
  Users, 
  Paperclip, 
  CheckCheck, 
  Smile, 
  Trash2, 
  Sparkles, 
  Mic, 
  File, 
  MoreVertical,
  ChevronRight,
  ShieldAlert,
  User as UserIcon,
  CornerDownRight
} from "lucide-react";

interface InternalChatProps {
  currentUser: User;
  onAddToast: (title: string, message: string, type: "success" | "info" | "warning" | "error") => void;
}

export default function InternalChat({ currentUser, onAddToast }: InternalChatProps) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const [activeRoomId, setActiveRoomId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [typedMessage, setTypedMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  
  // File upload simulation state
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; url: string; type: string }[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat data
  const loadChatData = () => {
    const loadedRooms = getChatRooms();
    const loadedMessages = getChatMessages();
    const loadedUsers = getUsers().filter(u => u.id !== currentUser.id && u.status === "active");
    
    setRooms(loadedRooms);
    setMessages(loadedMessages);
    setUsers(loadedUsers);
    
    if (loadedRooms.length > 0 && !activeRoomId) {
      setActiveRoomId(loadedRooms[0].id);
    }
  };

  useEffect(() => {
    loadChatData();
    const interval = setInterval(loadChatData, 5000);
    
    // Listen for external DB updates
    const handleDbUpdate = () => loadChatData();
    window.addEventListener("thulamela_db_update", handleDbUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("thulamela_db_update", handleDbUpdate);
    };
  }, []);

  useEffect(() => {
    // Scroll to bottom when active room or messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    
    // Mark as read when active room changes
    if (activeRoomId) {
      const allMsgs = getChatMessages();
      let updated = false;
      const updatedMsgs = allMsgs.map(m => {
        if (m.roomId === activeRoomId && m.senderId !== currentUser.id) {
          const reads = m.readBy || [];
          if (!reads.includes(currentUser.id)) {
            reads.push(currentUser.id);
            updated = true;
            return { ...m, readBy: reads };
          }
        }
        return m;
      });
      if (updated) {
        saveChatMessages(updatedMsgs);
        setMessages(updatedMsgs);
      }
    }
  }, [activeRoomId, messages.length]);

  // Handle Simulated Typing Indicator
  useEffect(() => {
    if (!activeRoomId) return;
    
    // Occasionally trigger typing indicator simulation when typing
    if (typedMessage.length > 2 && !isTyping) {
      setIsTyping(true);
      // Simulate technician or admin typing back after 3 seconds
      const currentRoom = rooms.find(r => r.id === activeRoomId);
      if (currentRoom) {
        const potentialTypers = currentRoom.participants.filter(p => p !== currentUser.id);
        if (potentialTypers.length > 0) {
          const randomTyperId = potentialTypers[Math.floor(Math.random() * potentialTypers.length)];
          const matchedUser = getUsers().find(u => u.id === randomTyperId);
          if (matchedUser) {
            setTypingUser(matchedUser.name);
            setTimeout(() => {
              setTypingUser(null);
            }, 4000);
          }
        }
      }
    } else if (typedMessage.length === 0) {
      setIsTyping(false);
    }
  }, [typedMessage]);

  const activeRoom = rooms.find(r => r.id === activeRoomId);
  const activeRoomMessages = messages
    .filter(m => m.roomId === activeRoomId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Send Message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() && attachedFiles.length === 0) return;

    const allMsgs = getChatMessages();
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      roomId: activeRoomId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      message: typedMessage.trim(),
      timestamp: new Date().toISOString(),
      attachments: attachedFiles.length > 0 ? attachedFiles : undefined,
      readBy: [currentUser.id],
      reactions: []
    };

    const updatedMsgs = [...allMsgs, newMessage];
    saveChatMessages(updatedMsgs);
    setMessages(updatedMsgs);

    // Update room last message info
    const allRooms = getChatRooms();
    const updatedRooms = allRooms.map(r => {
      if (r.id === activeRoomId) {
        return {
          ...r,
          lastMessage: typedMessage.trim() || `Sent ${attachedFiles.length} file(s)`,
          lastMessageTime: new Date().toISOString()
        };
      }
      return r;
    });
    saveChatRooms(updatedRooms);
    setRooms(updatedRooms);

    // Reset inputs
    setTypedMessage("");
    setAttachedFiles([]);
    setIsTyping(false);

    // Add brief audit log
    addAuditLog(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      "Send Message",
      `Sent chat message in room ${activeRoomId}`
    );
  };

  // Create Direct Message Room
  const handleStartDM = (targetUser: User) => {
    const allRooms = getChatRooms();
    const roomName = `${targetUser.name} (${targetUser.role.replace("_", " ")})`;
    
    // Check if DM room already exists between these two
    const existing = allRooms.find(r => 
      r.type === "direct" && 
      r.participants.includes(currentUser.id) && 
      r.participants.includes(targetUser.id)
    );

    if (existing) {
      setActiveRoomId(existing.id);
      onAddToast("Conversation Found", `Opening chat with ${targetUser.name}.`, "info");
      return;
    }

    const newRoom: ChatRoom = {
      id: `room-dm-${Date.now()}`,
      name: roomName,
      type: "direct",
      participants: [currentUser.id, targetUser.id],
      lastMessage: "Conversation initiated.",
      lastMessageTime: new Date().toISOString()
    };

    const updatedRooms = [newRoom, ...allRooms];
    saveChatRooms(updatedRooms);
    setRooms(updatedRooms);
    setActiveRoomId(newRoom.id);

    onAddToast("Chat Started", `New direct messaging session with ${targetUser.name} initialized.`, "success");
  };

  // Toggle Pinned Status
  const handleTogglePin = (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const allRooms = getChatRooms();
    const updated = allRooms.map(r => {
      if (r.id === roomId) {
        const pins = r.pinnedBy || [];
        if (pins.includes(currentUser.id)) {
          return { ...r, pinnedBy: pins.filter(p => p !== currentUser.id) };
        } else {
          return { ...r, pinnedBy: [...pins, currentUser.id] };
        }
      }
      return r;
    });
    saveChatRooms(updated);
    setRooms(updated);
    onAddToast("Chat Pinned", "Room pinning preferences updated.", "success");
  };

  // Toggle Archive Status
  const handleToggleArchive = (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const allRooms = getChatRooms();
    const updated = allRooms.map(r => {
      if (r.id === roomId) {
        const archives = r.archivedBy || [];
        if (archives.includes(currentUser.id)) {
          return { ...r, archivedBy: archives.filter(a => a !== currentUser.id) };
        } else {
          return { ...r, archivedBy: [...archives, currentUser.id] };
        }
      }
      return r;
    });
    saveChatRooms(updated);
    setRooms(updated);
    onAddToast("Chat Archived", "Room archiving preferences updated.", "info");
  };

  // Message reaction handler
  const handleAddReaction = (messageId: string, emoji: string) => {
    const allMsgs = getChatMessages();
    const updated = allMsgs.map(m => {
      if (m.id === messageId) {
        const reactions = m.reactions || [];
        // Check if current user already reacted with this emoji
        const exists = reactions.some(r => r.userId === currentUser.id && r.emoji === emoji);
        if (exists) {
          return { ...m, reactions: reactions.filter(r => !(r.userId === currentUser.id && r.emoji === emoji)) };
        } else {
          return {
            ...m,
            reactions: [...reactions, { emoji, userId: currentUser.id, userName: currentUser.name }]
          };
        }
      }
      return m;
    });
    saveChatMessages(updated);
    setMessages(updated);
  };

  // Simulate file attachment
  const simulateAttachment = () => {
    const fileOptions = [
      { name: "IDP_Amendment_Report.pdf", type: "pdf", url: "https://www.thulamela.gov.za/IDP_Report.pdf" },
      { name: "site_inspection_photo.jpg", type: "image", url: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&q=80&w=300" },
      { name: "voice_note_feedback.mp3", type: "voice", url: "https://www.thulamela.gov.za/voice_note.mp3" }
    ];
    const chosen = fileOptions[Math.floor(Math.random() * fileOptions.length)];
    setAttachedFiles([...attachedFiles, chosen]);
    onAddToast("File Attached", `Successfully attached file: ${chosen.name}`, "info");
  };

  // Get Room Icon
  const getRoomIcon = (type: string) => {
    switch (type) {
      case "direct":
        return <UserIcon className="text-gov-blue" size={16} />;
      case "group":
        return <Users className="text-gov-green" size={16} />;
      case "broadcast":
        return <Megaphone className="text-red-500 animate-bounce" size={16} />;
      default:
        return <MessageSquare size={16} />;
    }
  };

  const filteredRooms = rooms.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (r.lastMessage || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    // Do not show archived rooms in the main sidebar unless there are no normal ones
    const isArchived = (r.archivedBy || []).includes(currentUser.id);
    return matchesSearch && !isArchived;
  });

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case "super_admin": return "Super Admin";
      case "municipal_admin": return "Admin";
      case "councillor": return "Councillor";
      case "technician": return "Technician";
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden flex flex-col md:flex-row h-[600px]">
      
      {/* 1. Side panel: Conversation rooms and Users */}
      <div className="w-full md:w-80 border-r border-slate-100 flex flex-col bg-slate-50/50">
        
        {/* Search & Header */}
        <div className="p-4 border-b border-slate-100 bg-white space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-xs text-slate-800 uppercase tracking-widest flex items-center">
              <MessageSquare className="mr-1.5 text-gov-green" size={15} />
              <span>Internal Dispatch Chat</span>
            </h3>
            <span className="text-[10px] font-mono bg-gov-green/10 text-gov-green px-1.5 py-0.5 rounded font-bold uppercase">
              Staff Secure
            </span>
          </div>
          
          <div className="relative">
            <input
              type="text"
              placeholder="Search chats or dispatch notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:outline-none focus:border-gov-green focus:bg-white transition-all text-base"
            />
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
          </div>
        </div>

        {/* Conversation List Tab panel */}
        <div className="flex-grow overflow-y-auto p-2 space-y-1">
          
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-3 py-1.5 block">
            ACTIVE CHANNELS ({filteredRooms.length})
          </span>
          
          {filteredRooms.length === 0 ? (
            <p className="text-[11px] text-slate-400 text-center py-4">No active conversations found.</p>
          ) : (
            filteredRooms.map((r) => {
              const isPinned = (r.pinnedBy || []).includes(currentUser.id);
              const isActive = r.id === activeRoomId;
              const unreadCount = messages.filter(m => m.roomId === r.id && !m.readBy?.includes(currentUser.id)).length;

              return (
                <div
                  key={r.id}
                  onClick={() => setActiveRoomId(r.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                    isActive 
                      ? "bg-slate-900 text-white shadow-sm" 
                      : "hover:bg-slate-100 text-slate-700 bg-white/60 border border-slate-100"
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className={`p-2 rounded-lg ${isActive ? "bg-slate-800" : "bg-slate-100"}`}>
                      {getRoomIcon(r.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1">
                        <h4 className={`text-xs font-black truncate max-w-[130px] ${isActive ? "text-white" : "text-slate-800"}`}>
                          {r.name}
                        </h4>
                        {isPinned && <Pin size={10} className="text-gov-yellow fill-gov-yellow flex-shrink-0" />}
                      </div>
                      <p className={`text-[10px] truncate max-w-[150px] ${isActive ? "text-slate-400" : "text-slate-500"}`}>
                        {r.lastMessage}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-1">
                    {r.lastMessageTime && (
                      <span className={`text-[8px] font-mono ${isActive ? "text-slate-400" : "text-slate-400"}`}>
                        {new Date(r.lastMessageTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                    {unreadCount > 0 && (
                      <span className="bg-red-600 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Direct message directory list */}
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-3 pt-4 pb-1.5 block">
            MUNICIPAL DIRECTORY ({users.length})
          </span>
          <div className="grid grid-cols-1 gap-1 px-1">
            {users.map((u) => (
              <div
                key={u.id}
                onClick={() => handleStartDM(u)}
                className="flex items-center justify-between p-2 rounded-lg bg-white/40 border border-slate-100 hover:bg-slate-100 cursor-pointer transition-all"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[10px] text-slate-700">
                    {u.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h5 className="text-[11px] font-black text-slate-800 leading-tight">{u.name}</h5>
                    <span className="text-[9px] text-gov-blue font-bold tracking-tight">{getRoleLabel(u.role)}</span>
                  </div>
                </div>
                <ChevronRight size={12} className="text-slate-400" />
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* 2. Main Chat Feed Section */}
      <div className="flex-grow flex flex-col h-full bg-slate-50 relative">
        {activeRoom ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-slate-100 bg-white flex justify-between items-center">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="p-1 rounded-md bg-slate-100 text-slate-700">
                    {getRoomIcon(activeRoom.type)}
                  </span>
                  <h3 className="font-black text-sm text-slate-900 leading-tight">
                    {activeRoom.name}
                  </h3>
                </div>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Participants: {activeRoom.participants.join(", ")}
                </p>
              </div>

              {/* Chat action headers */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={(e) => handleTogglePin(activeRoom.id, e)}
                  className={`p-1.5 rounded-lg hover:bg-slate-100 transition-all ${
                    (activeRoom.pinnedBy || []).includes(currentUser.id) ? "text-gov-yellow bg-amber-50" : "text-slate-400"
                  }`}
                  title="Pin Room"
                >
                  <Pin size={14} className={(activeRoom.pinnedBy || []).includes(currentUser.id) ? "fill-gov-yellow" : ""} />
                </button>
                <button
                  onClick={(e) => handleToggleArchive(activeRoom.id, e)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-all"
                  title="Archive Room"
                >
                  <Archive size={14} />
                </button>
              </div>
            </div>

            {/* Messages feed list */}
            <div className="flex-grow overflow-y-auto p-5 space-y-4">
              
              {activeRoomMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <Sparkles size={24} className="text-gov-yellow mb-2 opacity-55" />
                  <p className="text-xs font-bold">Secure connection established.</p>
                  <p className="text-[10px] text-slate-400 mt-1">Start messaging in this secure channel.</p>
                </div>
              ) : (
                activeRoomMessages.map((msg, index) => {
                  const isMine = msg.senderId === currentUser.id;
                  const isUnread = !msg.readBy?.includes(currentUser.id);

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"} space-x-2 max-w-full`}
                    >
                      {/* Avatar */}
                      {!isMine && (
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-1">
                          {msg.senderName.substring(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className="max-w-[70%] space-y-1">
                        {/* Name and role */}
                        {!isMine && (
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] font-black text-slate-700">{msg.senderName}</span>
                            <span className="text-[8px] bg-slate-200 text-slate-600 font-mono font-bold px-1 rounded uppercase">
                              {getRoleLabel(msg.senderRole)}
                            </span>
                          </div>
                        )}

                        {/* Speech Bubble */}
                        <div className={`p-3 rounded-2xl text-xs relative ${
                          isMine 
                            ? "bg-gov-green text-white rounded-tr-none" 
                            : "bg-white text-slate-800 border border-slate-200/80 rounded-tl-none shadow-sm"
                        }`}>
                          
                          {/* File Attachment previews */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="space-y-1.5 mb-2 border-b border-white/25 pb-2">
                              {msg.attachments.map((file, fIdx) => (
                                <a 
                                  key={fIdx}
                                  href={file.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className={`flex items-center space-x-2 p-1.5 rounded-lg border text-[11px] ${
                                    isMine 
                                      ? "bg-emerald-800/40 border-emerald-700 hover:bg-emerald-800/60" 
                                      : "bg-slate-100 border-slate-200 hover:bg-slate-200"
                                  }`}
                                >
                                  <File size={14} className={isMine ? "text-white" : "text-gov-blue"} />
                                  <span className="font-bold truncate max-w-[150px]">{file.name}</span>
                                </a>
                              ))}
                            </div>
                          )}

                          <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>

                          {/* Footer with timestamp / indicators */}
                          <div className="flex items-center justify-between mt-1.5 space-x-3">
                            <span className={`text-[8px] font-mono ${isMine ? "text-emerald-100" : "text-slate-400"}`}>
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>

                            {isMine && (
                              <div className="flex items-center text-[9px] text-emerald-100">
                                <CheckCheck size={12} className="ml-1" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Reaction Display & Add reaction */}
                        <div className="flex items-center flex-wrap gap-1 mt-0.5">
                          {msg.reactions && msg.reactions.map((react, rIdx) => (
                            <button
                              key={rIdx}
                              onClick={() => handleAddReaction(msg.id, react.emoji)}
                              className="bg-white border border-slate-200 hover:bg-slate-50 text-[10px] px-1 rounded-full flex items-center space-x-1"
                              title={`Reacted by ${react.userName}`}
                            >
                              <span>{react.emoji}</span>
                            </button>
                          ))}
                          
                          {/* Small quick emoji reaction tray */}
                          <div className="flex items-center space-x-0.5 opacity-0 hover:opacity-100 transition-opacity">
                            {["👍", "❤️", "⚠️", "🔥"].map((emo) => (
                              <button
                                key={emo}
                                onClick={() => handleAddReaction(msg.id, emo)}
                                className="text-[10px] hover:scale-125 transition-transform"
                              >
                                {emo}
                              </button>
                            ))}
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })
              )}
              
              {/* Simulated typing indicator placeholder */}
              {typingUser && (
                <div className="flex items-center space-x-2 text-[10px] text-slate-500 italic pl-10">
                  <div className="flex space-x-1">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                  </div>
                  <span>{typingUser} is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Form area */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100 flex flex-col space-y-2">
              
              {/* File preview thumbnails */}
              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {attachedFiles.map((file, fIdx) => (
                    <div key={fIdx} className="flex items-center space-x-1.5 bg-slate-100 border border-slate-200 rounded px-2 py-1 text-[10px] font-mono">
                      <File size={12} className="text-slate-500" />
                      <span>{file.name}</span>
                      <button 
                        type="button" 
                        onClick={() => setAttachedFiles(attachedFiles.filter((_, idx) => idx !== fIdx))}
                        className="text-red-500 font-bold hover:text-red-700 ml-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={simulateAttachment}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors"
                  title="Attach Documents or Photos"
                >
                  <Paperclip size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setTypedMessage(p => p + " 👍")}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors"
                  title="Insert Quick Reaction Emoji"
                >
                  <Smile size={16} />
                </button>
                <input
                  type="text"
                  value={typedMessage}
                  onChange={(e) => setTypedMessage(e.target.value)}
                  placeholder="Type secure message (e.g. Ward update or technical status)..."
                  className="flex-grow bg-slate-50 border border-slate-200 focus:outline-none focus:border-gov-green focus:bg-white p-2.5 rounded-xl font-semibold transition-all text-base"
                />
                <button
                  type="submit"
                  disabled={!typedMessage.trim() && attachedFiles.length === 0}
                  className="p-3 bg-gov-green hover:bg-gov-green-hover text-white rounded-xl transition-all shadow-md shadow-gov-green/10 disabled:opacity-50"
                >
                  <Send size={15} />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <MessageSquare size={36} className="opacity-30 mb-2" />
            <p className="text-xs font-bold">Select a Dispatch Channel or Directory User</p>
            <p className="text-[10px] mt-1">Start secure internal communication within the municipality team.</p>
          </div>
        )}
      </div>

    </div>
  );
}
