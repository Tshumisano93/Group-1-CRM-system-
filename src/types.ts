/**
 * Thulamela Municipality CRM Types
 */

export type UserRole = "super_admin" | "municipal_admin" | "councillor" | "technician";

export interface User {
  id: string;               // Auto-generated ID (e.g., COUN-101, TECH-201, ADMIN-301)
  name: string;
  email: string;
  phone: string;
  physicalAddress: string;
  username: string;
  role: UserRole;
  employeeNumber?: string;   // For Councillor/Staff
  saIdNumber?: string;       // South African ID number
  wardNumber?: number;       // For Councillor, 1-41
  wardName?: string;         // For Councillor
  politicalPosition?: string; // For Councillor (e.g., ANC Chief Whip, Councillor, Independent, EFF Ward Rep)
  profilePicture?: string;
  status: "active" | "inactive";
  dateCreated: string;
  tempPassword?: string;
  mustChangePassword?: boolean;
}

export interface Ward {
  wardNumber: number;        // 1 to 41
  wardName: string;          // Specific community name (e.g., Thohoyandou, Sibasa, Makwarela, etc.)
  assignedCouncillorId: string | null;
  councillorName: string | null;
  contactDetails: string | null;
  performancePercentage: number;
}

export interface Department {
  id: string;
  name: string;
  code: string;              // WATER, ELEC, ROAD, WASTE, SANI, STORM, LIGHT, COMM
  managerName: string;
  contactEmail: string;
  contactPhone: string;
  description: string;
  iconName: string;
}

export interface Technician {
  id: string;
  name: string;
  departmentId: string;
  departmentName: string;
  phone: string;
  email: string;
  status: "available" | "busy" | "on_leave";
  activeTasks: number;
  completedTasks: number;
}

export type ComplaintStatus = 
  | "Draft" 
  | "Submitted" 
  | "Received" 
  | "Under Review" 
  | "Assigned" 
  | "In Progress" 
  | "Waiting for Parts" 
  | "Waiting for Approval" 
  | "Resolved" 
  | "Closed" 
  | "Rejected" 
  | "Cancelled" 
  | "Reopened";

export type ComplaintPriority = "Low" | "Medium" | "High" | "Critical" | "Emergency";

export interface ComplaintLog {
  id: string;
  timestamp: string;
  action: string;            // e.g., "Complaint Lodged", "Technician Assigned", "Status Updated to Resolved"
  userName: string;
  userRole: UserRole;
  note: string;
}

export interface ComplaintComment {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  message: string;
}

export interface Complaint {
  id: string;                // COMP-1001, COMP-1002, etc.
  title: string;
  description: string;
  category: string;          // Water Supply, Electricity, Roads, Waste Collection, Sanitation, Storm Water, Street Lighting, Community Services, Parks, Infrastructure, Housing
  wardNumber: number;        // 1-41
  wardName: string;
  reporterId: string;        // Councillor User ID
  reporterName: string;
  status: ComplaintStatus;
  departmentId: string | null;
  departmentName: string | null;
  assignedTechnicianId: string | null;
  assignedTechnicianName: string | null;
  priority: ComplaintPriority;
  dateCreated: string;
  dateUpdated: string;
  logs: ComplaintLog[];
  comments: ComplaintComment[];
  resolutionNotes?: string;
  referencePhoto?: string;
  
  // Part 2 extended fields
  subCategory?: string;
  streetAddress?: string;
  village?: string;
  area?: string;
  gpsCoordinates?: string;
  landmark?: string;
  preferredContactMethod?: "SMS" | "Email" | "Call" | "WhatsApp";
  supportingImages?: string[];
  supportingDocuments?: string[];
  voiceNote?: string;
  video?: string;
  citizenName?: string;
  citizenContactNumber?: string;
  affectedResidents?: number;
  emergencyLevel?: "Low" | "Medium" | "Severe" | "Disastrous";
  isDraft?: boolean;
  rating?: number;
  verificationComments?: string;
  internalNotes?: string;
  escalated?: boolean;
  escalationLevel?: 1 | 2 | 3;
  escalationReason?: string;
  escalationDuration?: string;
}

export interface AccountRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  wardNumber: number;
  politicalPosition: string;
  saIdNumber: string;
  status: "pending" | "approved" | "rejected";
  dateRequested: string;
}

export interface Notification {
  id: string;
  userId: string;            // Target User ID (or "all")
  role?: UserRole | "all";   // Target User Role
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "alert";
  isRead: boolean;
  timestamp: string;
  complaintId?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: "announcement" | "news" | "event";
  date: string;
  category: string;
  author: string;
  isEmergency?: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;            // e.g., "Create Councillor", "Update Complaint Status"
  details: string;
}

// ==========================================
// Part 4 – Advanced Features Interfaces
// ==========================================

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  timestamp: string;
  attachments?: { name: string; url: string; type: string }[];
  readBy?: string[];
  reactions?: { emoji: string; userId: string; userName: string }[];
}

export interface ChatRoom {
  id: string;
  name: string;
  type: "direct" | "group" | "broadcast";
  participants: string[]; // List of user IDs
  departmentId?: string; // For department group chats
  complaintId?: string; // For complaint feedback chat rooms
  pinnedBy?: string[]; // list of user IDs who pinned this chat
  archivedBy?: string[]; // list of user IDs who archived this chat
  lastMessage?: string;
  lastMessageTime?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  type: "inspection" | "technician_visit" | "community_meeting" | "event" | "deadline" | "maintenance";
  startDate: string;
  endDate: string;
  location: string;
  assignedUserId?: string;
  wardNumber?: number;
  complaintId?: string;
}

export interface Task {
  id: string; // Task Number e.g. TSK-1001
  title: string;
  description: string;
  assignedUserId: string;
  assignedUserName: string;
  departmentId: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "Pending" | "In Progress" | "Completed" | "Cancelled";
  startDate: string;
  dueDate: string;
  completionDate?: string;
  progressPercentage: number;
  attachments?: { name: string; url: string }[];
  comments?: { id: string; userName: string; text: string; timestamp: string }[];
}

export interface MunicipalDocument {
  id: string;
  title: string;
  category: "complaint_docs" | "reports" | "policies" | "minutes" | "contracts" | "inspections" | "certificates" | "training";
  fileUrl: string;
  fileType: string;
  fileSize: string;
  version: number;
  uploadedBy: string;
  uploadedByName: string;
  uploadedDate: string;
  history?: { version: number; fileUrl: string; date: string; updatedBy: string }[];
}

export interface DigitalForm {
  id: string;
  type: "inspection" | "site_visit" | "completion" | "verification" | "checklist" | "incident" | "emergency";
  title: string;
  formData: any;
  attachments?: string[];
  signature?: string;
  gpsCoordinates?: string;
  submittedBy: string;
  submittedByName: string;
  date: string;
  isDraft: boolean;
}

export interface ServiceNotice {
  id: string;
  title: string;
  category: "Water" | "Electricity" | "Roads" | "Sewer" | "Waste" | "StreetLights" | "StormWater" | "Parks" | "Housing" | "General";
  status: "Scheduled" | "In Progress" | "Delayed" | "Completed" | "Emergency" | "Operational" | "Maintenance";
  description: string;
  cause: string;
  dateReported: string;
  estimatedCompletion: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  affectedWards: number[];
  affectedArea: string;
  gpsCoordinates?: string; // Format: "lat,lng"
  department: string;
  departmentManager: string;
  emergencyNumber: string;
  email: string;
  officeHours: string;
  assignedTechnician?: string;
  referenceNumber: string;
  progress: number;
  timeline: { time: string; description: string }[];
  streetLocation?: string;
  estimatedDuration?: string;
  servicesAffected?: string[];
  householdsAffected?: number;
  lastUpdated?: string;
  photos?: string[];
  videos?: string[];
}

