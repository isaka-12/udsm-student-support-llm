import {
  BookOpen, Calendar, CreditCard, Home, GraduationCap,
  Cpu, UserPlus, ClipboardList, Library, HelpCircle,
} from 'lucide-react';

export const QUICK_TOPICS = [
  { icon: ClipboardList, label: 'Course Registration',  question: 'How do I register for courses at UDSM?' },
  { icon: Calendar,      label: 'Academic Calendar',    question: 'What does the UDSM academic calendar look like?' },
  { icon: BookOpen,      label: 'Exam Regulations',     question: 'What are the examination regulations at UDSM?' },
  { icon: Home,          label: 'Hostel Application',   question: 'How do I apply for hostel accommodation at UDSM?' },
  { icon: CreditCard,    label: 'Fee Payment',          question: 'How do I pay my tuition fees at UDSM?' },
  { icon: CreditCard,    label: 'HESLB Loans',          question: 'How do I apply for a HESLB student loan at UDSM?' },
  { icon: UserPlus,      label: 'Admissions',           question: 'What are the undergraduate admission requirements at UDSM?' },
  { icon: Cpu,           label: 'AI Usage Policy',      question: 'What percentage of AI use is allowed in academic work at UDSM?' },
  { icon: BookOpen,      label: 'Joining Instructions', question: 'What should a new student know when joining UDSM?' },
  { icon: GraduationCap, label: 'Graduation',           question: 'What are the graduation requirements at UDSM?' },
  { icon: HelpCircle,    label: 'Student Portal',       question: 'How do I access and use the UDSM student portal (ARIS)?' },
  { icon: Library,       label: 'Library Services',     question: 'What library services are available to UDSM students?' },
];
