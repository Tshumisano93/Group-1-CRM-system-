import React, { useState } from "react";
import { 
  Droplets, 
  Zap, 
  Trash2, 
  Lightbulb, 
  Trees, 
  Users, 
  Home, 
  CloudRain, 
  Wrench, 
  ArrowRight, 
  Info, 
  X, 
  ShieldAlert, 
  Clock,
  Building2
} from "lucide-react";

interface Service {
  id: string;
  title: string;
  icon: React.ReactNode;
  shortDesc: string;
  longDesc: string;
  sla: string; // Service Level Agreement Response Time
  manager: string;
  contact: string;
  operatingProcedures: string[];
}

export default function PublicServices() {
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const services: Service[] = [
    {
      id: "water",
      title: "Water Supply",
      icon: <Droplets className="text-gov-blue" size={28} />,
      shortDesc: "Provision of clean piped drinking water, borehole management, water tankers, and plumbing infrastructure maintenance.",
      longDesc: "The Water and Sanitation Department works in conjunction with Vhembe District Municipality to operate local purification assets, install main water pipes, service community borehole grids, and dispatch mobile water tankers during drought spells or scheduled main-line maintenance.",
      sla: "24 Hours for major pipe bursts, 48 Hours for standard village leaks.",
      manager: "Nnditsheni Mudau",
      contact: "water.services@thulamela.gov.za • 015 962 7611",
      operatingProcedures: [
        "Continuous monitoring of water quality markers at local reservoirs.",
        "Emergency dispatch of tankers to clinics, schools, and central villages.",
        "Rapid-response maintenance of solar and electric village borehole pumps."
      ]
    },
    {
      id: "electricity",
      title: "Electricity & Energy",
      icon: <Zap className="text-gov-yellow" size={28} />,
      shortDesc: "Maintenance of the municipal electricity grid, transformers, smart meter billing, and electrical line upgrades.",
      longDesc: "Responsible for managing high-voltage distribution networks across urban and rural wards, coordinating load reduction/load shedding mitigations, repairing storm-damaged electrical cables, and assisting Eskom with primary distribution grid connections.",
      sla: "12 Hours for dangerous electrical line snaps, 24 Hours for transformer outages.",
      manager: "Avhapfani Nemamilwe",
      contact: "energy@thulamela.gov.za • 015 962 7612",
      operatingProcedures: [
        "SLA compliance in high-risk zones (e.g. exposed wires or hospital nodes).",
        "Transformer replacement following severe storm damage or grid surges.",
        "Auditing pre-paid and smart-meter compliance in business hubs."
      ]
    },
    {
      id: "roads",
      title: "Road Maintenance",
      icon: <Wrench className="text-gov-green" size={28} />,
      shortDesc: "Pothole patching, gravel road grading, street sign installation, and general tar maintenance.",
      longDesc: "Oversees local access roads within all 41 wards. Key responsibilities include continuous pothole repairs, tarring of major access corridors, grading of rural agricultural gravel routes, and keeping lanes safe with clear signage and warning indicators.",
      sla: "48 Hours for highly hazardous arterial potholes, 7 Days for minor access gravel grading.",
      manager: "Thilivhali Nemutudi",
      contact: "infrastructure@thulamela.gov.za • 015 962 7613",
      operatingProcedures: [
        "Annual budgeting and execution of tar-laying tenders.",
        "Emergency pothole patching along high-speed corridors.",
        "Coordinating detours and warning markers with local traffic police."
      ]
    },
    {
      id: "waste",
      title: "Waste Collection",
      icon: <Trash2 className="text-slate-600" size={28} />,
      shortDesc: "Weekly household refuse removal, commercial rubbish logistics, and illegal dumping site clean-ups.",
      longDesc: "Manages municipal garbage collection routines, maintains standard landfill assets, conducts public notices on anti-dumping regulations, and clears illegal dumping hotspots that threaten public health.",
      sla: "Weekly scheduled household pickup. 48 Hours to investigate illegal industrial dumping reports.",
      manager: "Tshilidzi Khorommbi",
      contact: "waste@thulamela.gov.za • 015 962 7614",
      operatingProcedures: [
        "Strict weekly bin-clearing schedule per ward.",
        "Operating Thohoyandou Municipal Landfill under national environment licenses.",
        "Placing refuse skips at busy shopping zones and public bus ranks."
      ]
    },
    {
      id: "sanitation",
      title: "Sanitation Services",
      icon: <Droplets className="text-blue-500" size={28} />,
      shortDesc: "Sewerage pipeline maintenance, vacuum tanker services for septic tanks, and community VIP toilets.",
      longDesc: "Responsible for managing the municipal waste-water sewer network, repairing blocked pipelines, servicing sewer pump stations, and emptying rural VIP pit latrines to ensure hygienic community standards.",
      sla: "24 Hours for severe biological sewer spills, 5 Days for standard septic suction requests.",
      manager: "Nnditsheni Mudau",
      contact: "water.services@thulamela.gov.za • 015 962 7611",
      operatingProcedures: [
        "Treating spill zones with safe chemical disinfectants immediately.",
        "Clearing blockages in municipal main sewer links.",
        "Expanding rural sanitation infrastructures to eliminate bucket structures."
      ]
    },
    {
      id: "stormwater",
      title: "Storm Water Drainage",
      icon: <CloudRain className="text-slate-700" size={28} />,
      shortDesc: "Clearing storm-water channels, culvert repairs, and flash-flood warning mitigations.",
      longDesc: "Maintains concrete channels and open drainage systems along municipal streets. The department removes blockages before summer rains, reinforces riverbanks near low-lying bridges, and installs high-volume culverts.",
      sla: "24 Hours during flood emergencies. 5 Working Days for clearing blocked street channels.",
      manager: "Thilivhali Nemutudi",
      contact: "infrastructure@thulamela.gov.za • 015 962 7613",
      operatingProcedures: [
        "Pre-rain season clearing of dirt, gravel, and branches from concrete channels.",
        "Urgent storm drain repair following heavy Limpopo rainfall storms.",
        "Inspecting structural safety of pedestrian concrete bridges."
      ]
    },
    {
      id: "lighting",
      title: "Street Lighting",
      icon: <Lightbulb className="text-amber-500" size={28} />,
      shortDesc: "Public street illumination, high-mast installation in village spots, and solar light replacements.",
      longDesc: "Maintains urban streetlights, critical crossroad signals, and high-mast lights in community spaces. This department focuses on crime-prevention lighting to support public safety.",
      sla: "48 Hours for active street zones, 5 Days for single bulb replacements in residential lines.",
      manager: "Khathu Ndou",
      contact: "streetlights@thulamela.gov.za • 015 962 7615",
      operatingProcedures: [
        "Transitioning traditional sodium lamps to high-efficiency LED lights.",
        "Maintaining high-mast lighting near rural taxi ranks and retail nodes.",
        "Inspecting cables to prevent copper wire theft."
      ]
    },
    {
      id: "community",
      title: "Community Services & Halls",
      icon: <Users className="text-purple-600" size={28} />,
      shortDesc: "Management of municipal halls, sports grounds, cemeteries, and community development programmes.",
      longDesc: "Manages public properties, including booking systems for civic centers, cemetery operations, local sports facilities, and general community development initiatives.",
      sla: "24 Hours to process booking applications, 48 Hours for urgent maintenance at booked sites.",
      manager: "Pfarelo Ravele",
      contact: "parks@thulamela.gov.za • 015 962 7616",
      operatingProcedures: [
        "Coordination of booking schedules for local municipal halls.",
        "Maintenance of local gravesites and burial registers.",
        "Developing youth development programmes at sport complexes."
      ]
    },
    {
      id: "parks",
      title: "Parks & Open Spaces",
      icon: <Trees className="text-emerald-600" size={28} />,
      shortDesc: "Pruning roadside vegetation, grass cutting in public parks, and environmental conservation projects.",
      longDesc: "Enhances the aesthetic value of the municipality by maintaining parks, keeping grass short, pruning dangerous branches over electric lines, and promoting green-space planting.",
      sla: "7 Days for standard grass cutting requests, 48 Hours to cut branches posing safety risks.",
      manager: "Pfarelo Ravele",
      contact: "parks@thulamela.gov.za • 015 962 7616",
      operatingProcedures: [
        "Routine clearing of overgrown brush near blind-spot corners.",
        "Maintaining civic center grass, flowers, and tree beds.",
        "Inspecting public children playgrounds for equipment structural safety."
      ]
    },
    {
      id: "infrastructure",
      title: "Municipal Infrastructure",
      icon: <Building2 className="text-gov-blue" size={28} />,
      shortDesc: "Capital development planning, building controls, structural inspections, and municipal facility upgrades.",
      longDesc: "Oversees long-term municipal building operations. This department regulates building plans, inspects construction sites, and manages building safety.",
      sla: "14 Working Days for building plan evaluations. 48 Hours to inspect unsafe structures.",
      manager: "Thilivhali Nemutudi",
      contact: "infrastructure@thulamela.gov.za • 015 962 7613",
      operatingProcedures: [
        "Evaluating and approving industrial and domestic construction drafts.",
        "Enforcing safety standards at municipal offices and building sites.",
        "Drafting future spatial expansion plans for rural-to-urban shifts."
      ]
    },
    {
      id: "housing",
      title: "Human Settlements & Housing",
      icon: <Home className="text-red-500" size={28} />,
      shortDesc: "RDP housing register coordination, low-cost housing allocations, and informal settlement upgrading.",
      longDesc: "Works with the national Department of Human Settlements to manage RDP housing applications, verify beneficiary credentials, and formalize structural settlements.",
      sla: "Registration processed within 48 Hours. Inspection of emergency storm-damaged housing within 24 Hours.",
      manager: "Pfarelo Ravele",
      contact: "parks@thulamela.gov.za • 015 962 7616",
      operatingProcedures: [
        "Updating the municipal housing waiting list.",
        "Inspecting RDP structural integrity and reporting construction defects.",
        "Allocating emergency materials to families affected by fires or storms."
      ]
    }
  ];

  return (
    <div id="public-services" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      
      {/* Page Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-gov-blue font-bold text-xs uppercase tracking-widest block">Municipal Mandate</span>
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Our Services & Standards</h1>
        <div className="w-16 h-1 bg-gov-yellow mx-auto"></div>
        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
          Thulamela Municipality is dedicated to providing affordable, reliable, and high-quality services in accordance with the national Batho Pele principles. Click "Learn More" on any department to view service standards, contact persons, and operational commitments.
        </p>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((svc) => (
          <div 
            key={svc.id}
            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group hover:border-gov-green/30"
          >
            <div className="space-y-3">
              <div className="bg-slate-50 w-12 h-12 rounded-xl flex items-center justify-center group-hover:bg-gov-green/5 transition-all">
                {svc.icon}
              </div>
              <h3 className="text-base font-bold text-slate-950 uppercase tracking-wide group-hover:text-gov-green transition-colors">
                {svc.title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {svc.shortDesc}
              </p>
            </div>

            <button
              id={`service-learn-${svc.id}`}
              onClick={() => setSelectedService(svc)}
              className="text-xs text-gov-green hover:text-gov-green-hover font-bold flex items-center space-x-1.5 pt-2 hover:underline transition-all w-fit"
            >
              <span>Learn Service Standards</span>
              <ArrowRight size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Detailed SLA standards Modal */}
      {selectedService && (
        <div 
          id="service-detail-modal" 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
        >
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-fadeIn">
            
            {/* Modal Header */}
            <div className="bg-white p-6 flex justify-between items-center border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="bg-slate-50 p-2.5 rounded-xl text-slate-800 border border-slate-100">
                  {selectedService.icon}
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight text-slate-900">{selectedService.title}</h3>
                  <span className="text-[10px] text-gov-blue uppercase font-mono tracking-wider font-extrabold">Service Standards & SLA</span>
                </div>
              </div>
              <button 
                id="close-service-modal"
                onClick={() => setSelectedService(null)}
                className="text-slate-400 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 p-2 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div>
                <h4 className="text-[10px] uppercase text-slate-400 font-bold tracking-wider font-mono">Overview</h4>
                <p className="text-xs text-slate-700 leading-relaxed mt-1">
                  {selectedService.longDesc}
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-[10px] uppercase text-slate-400 font-bold tracking-wider font-mono flex items-center">
                    <Clock size={10} className="mr-1 text-gov-blue" /> Commitment Response (SLA)
                  </h5>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">
                    {selectedService.sla}
                  </p>
                </div>
                <div>
                  <h5 className="text-[10px] uppercase text-slate-400 font-bold tracking-wider font-mono flex items-center">
                    <Wrench size={10} className="mr-1 text-gov-green" /> Department Manager
                  </h5>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">
                    {selectedService.manager}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] uppercase text-slate-400 font-bold tracking-wider font-mono mb-2">Key Operating Procedures</h4>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {selectedService.operatingProcedures.map((proc, i) => (
                    <li key={i} className="flex items-start">
                      <span className="w-1.5 h-1.5 rounded-full bg-gov-yellow mt-1.5 mr-2 flex-shrink-0"></span>
                      <span>{proc}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] text-slate-500 font-mono space-y-2 sm:space-y-0">
                <div>
                  <span className="block font-bold">DEPARTMENT DIRECT CONTACT</span>
                  <span className="text-gov-blue font-bold">{selectedService.contact}</span>
                </div>
                <span className="bg-gov-green/10 text-gov-green px-2 py-0.5 rounded uppercase font-bold text-[8px]">
                  Batho Pele Certified
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
              <button
                id="service-modal-close-btn"
                onClick={() => setSelectedService(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase rounded-lg transition-all"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
