import { Ward, Department, User, Complaint, Announcement, Technician, ServiceNotice } from "./types";

// Wards of Thulamela Local Municipality (1 to 41)
export const SEED_WARDS: Ward[] = [
  { wardNumber: 1, wardName: "Makwarela", assignedCouncillorId: "COUN-001", councillorName: "Cllr Azwihangwisi Radzilani", contactDetails: "082 123 4567", performancePercentage: 88 },
  { wardNumber: 2, wardName: "Sibasa", assignedCouncillorId: "COUN-002", councillorName: "Cllr Mulatedzi Nemudzivhadi", contactDetails: "083 456 7890", performancePercentage: 74 },
  { wardNumber: 3, wardName: "Thohoyandou Block A", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 4, wardName: "Thohoyandou Block J & F", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 5, wardName: "Maniini", assignedCouncillorId: "COUN-003", councillorName: "Cllr Khathu Rambuda", contactDetails: "079 789 1234", performancePercentage: 65 },
  { wardNumber: 6, wardName: "Mvudi", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 7, wardName: "Tshisahulu", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 8, wardName: "Ngovhela", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 9, wardName: "Phiphidi", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 10, wardName: "Vhufuli", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 11, wardName: "Khubvi", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 12, wardName: "Manyeding", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 13, wardName: "Damani", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 14, wardName: "Donald Fraser Area", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 15, wardName: "Dumasi", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 16, wardName: "Duthuni", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 17, wardName: "Dzwerani", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 18, wardName: "Gidjana", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 19, wardName: "Ha-Lambani", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 20, wardName: "Ha-Luvhimbi", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 21, wardName: "Ha-Makhuvha", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 22, wardName: "Ha-Makuya", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 23, wardName: "Ha-Mphego", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 24, wardName: "Lambani Village", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 25, wardName: "Lwamondo", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 26, wardName: "Mapate", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 27, wardName: "Matsika", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 28, wardName: "Mhinga", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 29, wardName: "Miluwani", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 30, wardName: "Mukula", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 31, wardName: "Mulenzhe", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 32, wardName: "Muraga", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 33, wardName: "Mutale Town", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 34, wardName: "Muledane", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 35, wardName: "Netshimbupfe", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 36, wardName: "Phandama", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 37, wardName: "Shayandima", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 38, wardName: "Tshikonelo", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 39, wardName: "Tshimbupfe", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 40, wardName: "Tshiombo", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 },
  { wardNumber: 41, wardName: "Vondwe", assignedCouncillorId: null, councillorName: null, contactDetails: null, performancePercentage: 0 }
];

// Municipal Departments
export const DEPARTMENTS: Department[] = [
  {
    id: "DEP-01",
    name: "Water and Sanitation",
    code: "WATER",
    managerName: "Nnditsheni Mudau",
    contactEmail: "water.services@thulamela.gov.za",
    contactPhone: "015 962 7611",
    description: "Responsible for clean water supply, sewer network management, borehole maintenance, and burst pipe repairs.",
    iconName: "Droplets"
  },
  {
    id: "DEP-02",
    name: "Electricity and Energy",
    code: "ELEC",
    managerName: "Avhapfani Nemamilwe",
    contactEmail: "energy@thulamela.gov.za",
    contactPhone: "015 962 7612",
    description: "Responsible for electrical grid maintenance, substation operations, meter issues, and municipal grid extensions.",
    iconName: "Zap"
  },
  {
    id: "DEP-03",
    name: "Roads and Infrastructure",
    code: "ROAD",
    managerName: "Thilivhali Nemutudi",
    contactEmail: "infrastructure@thulamela.gov.za",
    contactPhone: "015 962 7613",
    description: "Responsible for road maintenance, pothole patching, storm-water drainage systems, and bridge constructions.",
    iconName: "Road"
  },
  {
    id: "DEP-04",
    name: "Waste Management",
    code: "WASTE",
    managerName: "Tshilidzi Khorommbi",
    contactEmail: "waste@thulamela.gov.za",
    contactPhone: "015 962 7614",
    description: "Handles domestic rubbish collection, landfill operations, street sweeping, and illegal dumping clearance.",
    iconName: "Trash2"
  },
  {
    id: "DEP-05",
    name: "Electrical Services - Street Lighting",
    code: "LIGHT",
    managerName: "Khathu Ndou",
    contactEmail: "streetlights@thulamela.gov.za",
    contactPhone: "015 962 7615",
    description: "Manages all public street lighting, high masts, traffic signals, and dark alley illumination projects.",
    iconName: "Lightbulb"
  },
  {
    id: "DEP-06",
    name: "Parks and Community Services",
    code: "COMM",
    managerName: "Pfarelo Ravele",
    contactEmail: "parks@thulamela.gov.za",
    contactPhone: "015 962 7616",
    description: "Responsible for civic halls, sports complexes, public parks, cemeteries, grass cutting, and green-belt pruning.",
    iconName: "Trees"
  }
];

// Preloaded Technicians
export const SEED_TECHNICIANS: Technician[] = [
  { id: "TECH-001", name: "Vhonani Mapholi", departmentId: "DEP-01", departmentName: "Water and Sanitation", phone: "072 111 2222", email: "v.mapholi@thulamela.gov.za", status: "busy", activeTasks: 2, completedTasks: 18 },
  { id: "TECH-002", name: "Takalani Netshitungulu", departmentId: "DEP-02", departmentName: "Electricity and Energy", phone: "073 222 3333", email: "t.netshitungulu@thulamela.gov.za", status: "available", activeTasks: 0, completedTasks: 24 },
  { id: "TECH-003", name: "Rudzani Sinthumule", departmentId: "DEP-03", departmentName: "Roads and Infrastructure", phone: "079 333 4444", email: "r.sinthumule@thulamela.gov.za", status: "busy", activeTasks: 1, completedTasks: 15 },
  { id: "TECH-004", name: "Phathutshedzo Neluheni", departmentId: "DEP-04", departmentName: "Waste Management", phone: "081 444 5555", email: "p.neluheni@thulamela.gov.za", status: "available", activeTasks: 0, completedTasks: 31 },
  { id: "TECH-005", name: "Livhuwani Ramabulana", departmentId: "DEP-05", departmentName: "Electrical Services - Street Lighting", phone: "084 555 6666", email: "l.ramabulana@thulamela.gov.za", status: "on_leave", activeTasks: 0, completedTasks: 12 }
];

// Initial Users
export const SEED_USERS: User[] = [
  {
    id: "ADMIN-001",
    name: "Thilivhali Mulaudzi",
    email: "admin@thulamela.gov.za",
    phone: "015 962 7500",
    physicalAddress: "Thohoyandou Civic Centre, Limpopo",
    username: "superadmin",
    role: "super_admin",
    employeeNumber: "EMP-SA-001",
    saIdNumber: "8504125896084",
    status: "active",
    profilePicture: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    dateCreated: "2025-01-10T08:00:00Z"
  },
  {
    id: "ADMIN-002",
    name: "Tshifhiwa Nekhavhambe",
    email: "t.nekhavhambe@thulamela.gov.za",
    phone: "015 962 7501",
    physicalAddress: "Thohoyandou Civic Centre, Limpopo",
    username: "munadmin",
    role: "municipal_admin",
    employeeNumber: "EMP-MA-002",
    saIdNumber: "8911055678083",
    status: "active",
    profilePicture: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
    dateCreated: "2025-01-15T09:30:00Z"
  },
  {
    id: "COUN-001",
    name: "Cllr Azwihangwisi Radzilani",
    email: "a.radzilani@thulamela.gov.za",
    phone: "082 123 4567",
    physicalAddress: "124 Makwarela Ext, Thohoyandou",
    username: "cllr1",
    role: "councillor",
    wardNumber: 1,
    wardName: "Makwarela",
    employeeNumber: "EMP-CLLR-001",
    saIdNumber: "7811225893081",
    politicalPosition: "ANC Ward Councillor",
    status: "active",
    profilePicture: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
    dateCreated: "2025-02-01T10:00:00Z"
  },
  {
    id: "COUN-002",
    name: "Cllr Mulatedzi Nemudzivhadi",
    email: "m.nemudzivhadi@thulamela.gov.za",
    phone: "083 456 7890",
    physicalAddress: "45 Sibasa Main Rd, Sibasa",
    username: "cllr2",
    role: "councillor",
    wardNumber: 2,
    wardName: "Sibasa",
    employeeNumber: "EMP-CLLR-002",
    saIdNumber: "8205145781082",
    politicalPosition: "ANC Ward Councillor",
    status: "active",
    profilePicture: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150",
    dateCreated: "2025-02-01T10:30:00Z"
  },
  {
    id: "COUN-003",
    name: "Cllr Khathu Rambuda",
    email: "k.rambuda@thulamela.gov.za",
    phone: "079 789 1234",
    physicalAddress: "78 Maniini Village, Thohoyandou",
    username: "cllr5",
    role: "councillor",
    wardNumber: 5,
    wardName: "Maniini",
    employeeNumber: "EMP-CLLR-005",
    saIdNumber: "8809205123087",
    politicalPosition: "EFF Ward Councillor",
    status: "active",
    profilePicture: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    dateCreated: "2025-02-02T11:00:00Z"
  },
  {
    id: "TECH-001",
    name: "Vhonani Mapholi",
    email: "v.mapholi@thulamela.gov.za",
    phone: "072 111 2222",
    physicalAddress: "Thulamela Depot, Sibasa",
    username: "tech1",
    role: "technician",
    status: "active",
    profilePicture: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    dateCreated: "2025-02-05T08:00:00Z"
  },
  {
    id: "TECH-002",
    name: "Takalani Netshitungulu",
    email: "t.netshitungulu@thulamela.gov.za",
    phone: "073 222 3333",
    physicalAddress: "Thulamela Depot, Sibasa",
    username: "tech2",
    role: "technician",
    status: "active",
    profilePicture: "https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=150",
    dateCreated: "2025-02-05T08:30:00Z"
  }
];

// Preloaded Complaints
export const SEED_COMPLAINTS: Complaint[] = [
  {
    id: "COMP-1001",
    title: "Major Main Line Water Outage",
    description: "Residents in Makwarela Block F have been without water for 4 days. The borehole pump is suspected to be damaged or electricity grid-connected supply has a fault. This affects approximately 400 households.",
    category: "Water and Sanitation",
    wardNumber: 1,
    wardName: "Makwarela",
    reporterId: "COUN-001",
    reporterName: "Cllr Azwihangwisi Radzilani",
    status: "Resolved",
    departmentId: "DEP-01",
    departmentName: "Water and Sanitation",
    assignedTechnicianId: "TECH-001",
    assignedTechnicianName: "Vhonani Mapholi",
    priority: "High",
    dateCreated: "2026-07-01T08:30:00Z",
    dateUpdated: "2026-07-04T15:20:00Z",
    resolutionNotes: "Replaced faulty control valve and re-primed primary feed lines. Flow was restored successfully to all Block F branches.",
    logs: [
      { id: "log-1", timestamp: "2026-07-01T08:30:00Z", action: "Complaint Lodged", userName: "Cllr Azwihangwisi Radzilani", userRole: "councillor", note: "Lodge on behalf of Makwarela Ward 1 residents" },
      { id: "log-2", timestamp: "2026-07-01T10:15:00Z", action: "Department Assigned", userName: "Tshifhiwa Nekhavhambe", userRole: "municipal_admin", note: "Assigned to Water and Sanitation Department" },
      { id: "log-3", timestamp: "2026-07-01T14:00:00Z", action: "Technician Dispatched", userName: "Tshifhiwa Nekhavhambe", userRole: "municipal_admin", note: "Technician Vhonani Mapholi assigned for on-site assessment" },
      { id: "log-4", timestamp: "2026-07-04T15:20:00Z", action: "Marked as Resolved", userName: "Vhonani Mapholi", userRole: "technician", note: "Replaced faulty valve and restored flow." }
    ],
    comments: [
      { id: "com-1", timestamp: "2026-07-02T09:00:00Z", userId: "COUN-001", userName: "Cllr Azwihangwisi Radzilani", userRole: "councillor", message: "Any update? Residents are calling me directly. The local clinic is also affected." },
      { id: "com-2", timestamp: "2026-07-02T11:45:00Z", userId: "TECH-001", userName: "Vhonani Mapholi", userRole: "technician", message: "I've inspected the main feed. The water pump is fine, but a valve is completely cracked. Order has been approved and replacement is scheduled for tomorrow." }
    ]
  },
  {
    id: "COMP-1002",
    title: "Hazardous Deep Potholes on Main Road",
    description: "Severe deep potholes near the Sibasa main market traffic lights. Multiple motor vehicles have experienced tire blowouts. It is very dangerous, especially at night during high traffic volumes.",
    category: "Roads and Infrastructure",
    wardNumber: 2,
    wardName: "Sibasa",
    reporterId: "COUN-002",
    reporterName: "Cllr Mulatedzi Nemudzivhadi",
    status: "Assigned",
    departmentId: "DEP-03",
    departmentName: "Roads and Infrastructure",
    assignedTechnicianId: "TECH-003",
    assignedTechnicianName: "Rudzani Sinthumule",
    priority: "Critical",
    dateCreated: "2026-07-05T09:00:00Z",
    dateUpdated: "2026-07-06T11:30:00Z",
    logs: [
      { id: "log-1", timestamp: "2026-07-05T09:00:00Z", action: "Complaint Lodged", userName: "Cllr Mulatedzi Nemudzivhadi", userRole: "councillor", note: "Highly hazardous potholes registered." },
      { id: "log-2", timestamp: "2026-07-06T11:30:00Z", action: "Assigned to Department", userName: "Thilivhali Mulaudzi", userRole: "super_admin", note: "Assigned to Roads and Infrastructure & dispatched Rudzani Sinthumule." }
    ],
    comments: []
  },
  {
    id: "COMP-1003",
    title: "Defective Street Lights - Dark Street Zone",
    description: "An entire string of 12 streetlights on Maniini Road is completely dead. This zone has seen a high rise in housebreakings and muggings at night. Urgent intervention is requested for safety.",
    category: "Electrical Services - Street Lighting",
    wardNumber: 5,
    wardName: "Maniini",
    reporterId: "COUN-003",
    reporterName: "Cllr Khathu Rambuda",
    status: "Submitted",
    departmentId: null,
    departmentName: null,
    assignedTechnicianId: null,
    assignedTechnicianName: null,
    priority: "High",
    dateCreated: "2026-07-08T14:15:00Z",
    dateUpdated: "2026-07-08T14:15:00Z",
    logs: [
      { id: "log-1", timestamp: "2026-07-08T14:15:00Z", action: "Complaint Lodged", userName: "Cllr Khathu Rambuda", userRole: "councillor", note: "Registered light outage for safety concerns." }
    ],
    comments: []
  },
  {
    id: "COMP-1004",
    title: "Illegal Trash Dumping near Makwarela Primary",
    description: "A huge pile of toxic waste, household garbage, and construction debris is dumped daily near the Primary School entrance. It is attracting rats, flies, and smells horribly.",
    category: "Waste Management",
    wardNumber: 1,
    wardName: "Makwarela",
    reporterId: "COUN-001",
    reporterName: "Cllr Azwihangwisi Radzilani",
    status: "Submitted",
    departmentId: null,
    departmentName: null,
    assignedTechnicianId: null,
    assignedTechnicianName: null,
    priority: "Medium",
    dateCreated: "2026-07-09T10:00:00Z",
    dateUpdated: "2026-07-09T10:00:00Z",
    logs: [
      { id: "log-1", timestamp: "2026-07-09T10:00:00Z", action: "Complaint Lodged", userName: "Cllr Azwihangwisi Radzilani", userRole: "councillor", note: "Rubbish pile needs clearance." }
    ],
    comments: []
  }
];

// Announcements, news and events
export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "ann-1",
    title: "Urgent: Water Conservation Notice",
    content: "Due to high seasonal temperatures and low rainfall, reservoir levels in the Thohoyandou region are critically low. All residents are urged to restrict non-essential water usage immediately. Do not fill swimming pools or wash vehicles using hosepipes.",
    type: "announcement",
    date: "2026-07-09",
    category: "Water Supply",
    author: "Municipal Manager Office",
    isEmergency: true
  },
  {
    id: "ann-2",
    title: "IDP Community Consultation Forums",
    content: "Thulamela Local Municipality will be hosting the Integrated Development Plan (IDP) representative forums for the 2026/2027 fiscal cycle. Ward Councillors are requested to mobilize community members to attend sessions in their respective wards. Check schedule for details.",
    type: "event",
    date: "2026-07-15",
    category: "Community Planning",
    author: "Strategic Planning Department",
    isEmergency: false
  },
  {
    id: "ann-3",
    title: "Inaugural Launch of Digital CRM System",
    content: "Today marks the official transition from manual paper complaints to our modern Municipal CRM digital application. Ward Councillors across all 41 wards will now log and trace community infrastructure complaints in real-time. This system represents our commitment to fast service excellence, digital accountability, and direct action.",
    type: "news",
    date: "2026-07-10",
    category: "Digital Transformation",
    author: "Mayor Office Communications",
    isEmergency: false
  }
];

// Realistic Service Notices
export const SEED_SERVICE_NOTICES: ServiceNotice[] = [
  {
    id: "notice-1",
    title: "Main Supply Line Piping & Valve Replacements",
    category: "Water",
    status: "In Progress",
    description: "Upgrading aged galvanized steel pipelines to high-density polyethylene (HDPE) conduits to resolve recurrent water pressure dropouts and structural leakage.",
    cause: "Preventative upgrade of corrosive infrastructure and recurring pressure leaks.",
    dateReported: "2026-07-12T08:00:00Z",
    estimatedCompletion: "2026-07-16T17:00:00Z",
    priority: "High",
    affectedWards: [1, 2, 5],
    affectedArea: "Makwarela Block H & Sibasa East",
    streetLocation: "Mphaphuli Highway Crossing",
    department: "Water and Sanitation",
    departmentManager: "Nnditsheni Mudau",
    emergencyNumber: "015 962 7611",
    email: "water.services@thulamela.gov.za",
    officeHours: "08:00 - 16:30",
    assignedTechnician: "Vhonani Mapholi (Water Dept)",
    referenceNumber: "REF-WAT-9042",
    progress: 65,
    timeline: [
      { time: "2026-07-12 08:00", description: "Excavation and line identification started." },
      { time: "2026-07-13 10:00", description: "Corroded main valve decoupled." },
      { time: "2026-07-14 11:30", description: "New HDPE pipe segments fusing and laying." }
    ],
    estimatedDuration: "10 Hours daily (08:00 - 18:00)",
    servicesAffected: ["Municipal Drinking Water Flow", "School Hygiene Facilities Feed"],
    householdsAffected: 1250,
    lastUpdated: "2026-07-14T11:30:00Z",
    photos: ["https://images.unsplash.com/photo-1542060748-10c28b629f6f?auto=format&fit=crop&q=80&w=600"]
  },
  {
    id: "notice-2",
    title: "Sibasa Substation Primary Transformer Overhaul",
    category: "Electricity",
    status: "Scheduled",
    description: "Periodic maintenance on the secondary high-voltage transformer and replacement of faulty isolator switches to stabilize the regional distribution grid.",
    cause: "Worn isolator contacts and thermal expansion anomalies detected during drone thermography.",
    dateReported: "2026-07-15T06:00:00Z",
    estimatedCompletion: "2026-07-15T18:00:00Z",
    priority: "Critical",
    affectedWards: [2, 3, 12],
    affectedArea: "Sibasa Business District & Maniini North",
    streetLocation: "Khoroni Main Road Boulevard",
    department: "Electricity and Energy",
    departmentManager: "Avhapfani Nemamilwe",
    emergencyNumber: "015 962 7612",
    email: "energy@thulamela.gov.za",
    officeHours: "08:00 - 16:30",
    assignedTechnician: "Takalani Netshitungulu (Elec Dept)",
    referenceNumber: "REF-ELE-4011",
    progress: 10,
    timeline: [
      { time: "2026-07-14 09:00", description: "Pre-isolation safety checks approved. Mobile generators dispatched." }
    ],
    estimatedDuration: "12 Hours (Single day shutdown)",
    servicesAffected: ["Domestic Power Lines", "Commercial Grid Supply", "Substation Relay Feeders"],
    householdsAffected: 4300,
    lastUpdated: "2026-07-14T09:00:00Z",
    photos: ["https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&q=80&w=600"]
  },
  {
    id: "notice-3",
    title: "R523 Arterial Pothole Patching & Asphalt Resurfacing",
    category: "Roads",
    status: "Delayed",
    description: "Deep patching, base layer stabilization, and hot-mix asphalt resurfacing along highly degraded portions of the R523 transit corridor.",
    cause: "Heavy seasonal precipitation and high commercial truck volumes leading to extensive sub-base degradation.",
    dateReported: "2026-07-10T07:00:00Z",
    estimatedCompletion: "2026-07-18T16:30:00Z",
    priority: "Medium",
    affectedWards: [1, 7, 10],
    affectedArea: "Tshisahulu & Vhufuli West Corridor",
    streetLocation: "R523 Provincial Route (KM 14 to KM 18)",
    department: "Roads and Infrastructure",
    departmentManager: "Thilivhali Nemutudi",
    emergencyNumber: "015 962 7613",
    email: "infrastructure@thulamela.gov.za",
    officeHours: "08:00 - 16:30",
    assignedTechnician: "Rudzani Sinthumule (Roads Dept)",
    referenceNumber: "REF-ROD-2204",
    progress: 40,
    timeline: [
      { time: "2026-07-10 07:00", description: "Site setup and digital warning signage deployed." },
      { time: "2026-07-12 14:00", description: "Cold milling of top 50mm asphalt completed." },
      { time: "2026-07-14 13:15", description: "Delayed due to aggregate delivery logistics at local quarry." }
    ],
    estimatedDuration: "Intermittent single-lane traffic controls (Stop & Go)",
    servicesAffected: ["Arterial Commuter Traffic", "Public Transport Routes"],
    householdsAffected: 8500,
    lastUpdated: "2026-07-14T13:15:00Z",
    photos: ["https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600"]
  },
  {
    id: "notice-4",
    title: "Thohoyandou Block F Trunk Sewer Desilting & Unblocking",
    category: "Sewer",
    status: "Emergency",
    description: "Emergency high-pressure jetting and desilting of the 300mm main trunk sewer line to clear massive sand buildup and foreign object obstruction causing overflows.",
    cause: "Illegal storm-water channel connections and household debris clogging main junctions.",
    dateReported: "2026-07-14T02:00:00Z",
    estimatedCompletion: "2026-07-14T22:00:00Z",
    priority: "Critical",
    affectedWards: [5, 6],
    affectedArea: "Thohoyandou Block F Residential Sector",
    streetLocation: "Maniini Secondary Crescent",
    department: "Water and Sanitation",
    departmentManager: "Nnditsheni Mudau",
    emergencyNumber: "015 962 7611",
    email: "water.services@thulamela.gov.za",
    officeHours: "24/7 Emergency",
    assignedTechnician: "Water Sanitation Crew",
    referenceNumber: "REF-SWR-1055",
    progress: 80,
    timeline: [
      { time: "2026-07-14 02:00", description: "Overflow alert received from Ward Councillor. Crew dispatched." },
      { time: "2026-07-14 05:30", description: "High-pressure jetting truck connected; containment barriers erected." },
      { time: "2026-07-14 13:45", description: "Large blockage cleared. Secondary wash down underway." }
    ],
    estimatedDuration: "8 Hours immediate containment",
    servicesAffected: ["Secondary Sewer Outflows", "Sub-surface Drainage Conduits"],
    householdsAffected: 650,
    lastUpdated: "2026-07-14T13:45:00Z",
    photos: ["https://images.unsplash.com/photo-1581094288338-2314dddb7eed?auto=format&fit=crop&q=80&w=600"]
  },
  {
    id: "notice-5",
    title: "Ward 1 to 5 Regional Landfill Access Optimization & Refuse Rerouting",
    category: "Waste",
    status: "Completed",
    description: "Optimization of truck collection routes and emergency landfill machinery repairs to restore standard bi-weekly domestic refuse removal schedules.",
    cause: "Compactor breakdown at the primary landfill site causing offloading delays.",
    dateReported: "2026-07-08T08:00:00Z",
    estimatedCompletion: "2026-07-13T17:00:00Z",
    priority: "Low",
    affectedWards: [1, 2, 3, 4, 5],
    affectedArea: "Entire Thohoyandou Municipal Basin",
    streetLocation: "Civic Centre Waste Transfer Station",
    department: "Waste Management",
    departmentManager: "Tshilidzi Khorommbi",
    emergencyNumber: "015 962 7614",
    email: "waste@thulamela.gov.za",
    officeHours: "08:00 - 16:30",
    assignedTechnician: "Phathutshedzo Neluheni (Waste Dept)",
    referenceNumber: "REF-WST-8091",
    progress: 100,
    timeline: [
      { time: "2026-07-08 08:00", description: "Mechanical fault in landfill loader reported." },
      { time: "2026-07-10 11:00", description: "Alternative backup loader rented from construction vendor." },
      { time: "2026-07-13 17:00", description: "All backlog piles cleared. Normal collection schedule resumed." }
    ],
    estimatedDuration: "No direct utility shutdown (refuse collection delayed by 24h)",
    servicesAffected: ["Domestic Refuse Removal", "Business Waste Pickups"],
    householdsAffected: 15000,
    lastUpdated: "2026-07-13T17:00:00Z",
    photos: ["https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=600"]
  },
  {
    id: "notice-6",
    title: "Makwarela Community Safety LED High-Mast Retrofitting",
    category: "StreetLights",
    status: "Scheduled",
    description: "Retrofitting old energy-intensive high-pressure sodium (HPS) floodlights on 30-meter high-masts with durable, low-consumption municipal LED luminaires to increase illumination in high-crime zones.",
    cause: "High-crime zone designation by local SAPS and community policing forum requests.",
    dateReported: "2026-07-16T08:00:00Z",
    estimatedCompletion: "2026-07-18T16:00:00Z",
    priority: "Medium",
    affectedWards: [1, 11],
    affectedArea: "Makwarela Extension & Khubvi Border Zone",
    streetLocation: "Tshirovha Primary Outer Perimeter",
    department: "Electrical Services - Street Lighting",
    departmentManager: "Khathu Ndou",
    emergencyNumber: "015 962 7615",
    email: "streetlights@thulamela.gov.za",
    officeHours: "08:00 - 16:30",
    assignedTechnician: "Livhuwani Ramabulana (Streetlights Dept)",
    referenceNumber: "REF-LGT-6612",
    progress: 5,
    timeline: [
      { time: "2026-07-14 10:00", description: "Procured 24 heavy-duty 400W LED fixtures. Scheduled heavy boom crane." }
    ],
    estimatedDuration: "None (Daytime installation, night performance remains uncompromised)",
    servicesAffected: ["Public Streetlighting Grid", "Pedestrian Security Zones"],
    householdsAffected: 3100,
    lastUpdated: "2026-07-14T10:00:00Z",
    photos: ["https://images.unsplash.com/photo-1509395062183-67c5ad6faff9?auto=format&fit=crop&q=80&w=600"]
  }
];
