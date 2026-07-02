import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AppTask, AppTaskCompletion, UserProfile, UserRole, Language, AppUser } from '../types';
import { 
  CheckCircle2, 
  Calendar, 
  Clock, 
  AlertCircle, 
  Trash2, 
  PlusCircle, 
  Briefcase, 
  Tag, 
  Search, 
  Filter,
  User,
  X,
  Bell,
  Camera,
  RefreshCw,
  Play,
  Check,
  CheckCircle,
  FileText,
  Clock3,
  ShieldCheck,
  Users
} from 'lucide-react';

// Required by App.tsx for backward-compatibility compilation
export const demoTemplateTasks: any[] = [];
export const demoCompletions: any[] = [];

interface TaskModuleProps {
  companies?: any[];
  costCenters?: any[];
  view: 'tasksDashboard' | 'tasksPlanner';
  lang?: Language;
  globalDate?: string;
  setGlobalDate?: (date: string) => void;
  activeUser: UserProfile;
  users: UserProfile[];
  firebaseReady?: boolean;
  authUid?: string | null;
}

// Realistic hotel photos to mock work proof
const PRESET_PROOF_PHOTOS = [
  { id: 'p1', name: 'Zonă lobby igienizată', url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&auto=format&fit=crop&q=60&referrerPolicy=no-referrer' },
  { id: 'p2', name: 'Mic dejun buffet pregătit', url: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=400&auto=format&fit=crop&q=60&referrerPolicy=no-referrer' },
  { id: 'p3', name: 'Lenjerii primenite cameră', url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400&auto=format&fit=crop&q=60&referrerPolicy=no-referrer' },
  { id: 'p4', name: 'Mentenanță centrală completată', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=60&referrerPolicy=no-referrer' }
];

export default function TaskModule({ 
  view, 
  lang = 'RO', 
  globalDate = '2026-06-02', 
  setGlobalDate,
  activeUser, 
  users,
  firebaseReady = true,
  authUid
}: TaskModuleProps) {
  
  // Helper to safely execute confirm dialog without crashing sandboxed preview iframes
  const safeConfirm = (message: string): boolean => {
    try {
      return window.confirm(message);
    } catch (e) {
      console.warn("window.confirm blocked in sandbox iframe, auto-confirming:", e);
      return true;
    }
  };
  
  // Real database-like persistence backed by localStorage
  const [tasks, setTasks] = useState<AppTask[]>(() => {
    const saved = localStorage.getItem('efactura_app_tasks');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          return parsed.filter(item => {
            if (!item || !item.id) return false;
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });
        }
      } catch (e) {}
    }

    // Default Pre-seeded Tasks representing exact realistic hotel entries
    return [
      {
        id: 'task-inst-1',
        title: 'Pregătire Mic Dejun Buffet',
        description: 'Alimentare bufet cald și rece, verificare temperaturi mâncare servită clienților.',
        taskType: 'Recurring',
        recurrencePattern: 'Daily',
        assignedUserId: 'staff@hotel.com',
        dueDate: '2026-06-02',
        dueTime: '07:30',
        status: 'Completed',
        department: 'Mâncare & Restaurant'
      },
      {
        id: 'task-inst-2',
        title: 'Igienizare Standard Recurentă Camere',
        description: 'Curățenie de plecare și primenire lenjerii curate pentru etajele 1 și 2.',
        taskType: 'Recurring',
        recurrencePattern: 'Daily',
        assignedUserId: 'staff@hotel.com',
        dueDate: '2026-06-02',
        dueTime: '11:00',
        status: 'In Progress',
        department: 'Housekeeping'
      },
      {
        id: 'task-inst-3',
        title: 'Audit Presiune Valve Centrală Termică',
        description: 'Măsurare presiune cazane apă caldă și raportare valori în registrul de siguranță.',
        taskType: 'Recurring',
        recurrencePattern: 'Weekly',
        assignedUserId: 'staff@hotel.com',
        dueDate: '2026-06-02',
        dueTime: '14:00',
        status: 'Pending',
        department: 'Mentenanță'
      },
      {
        id: 'task-inst-4',
        title: 'Inventar Urgent Minibar & Cosmetice lobby',
        description: 'Numărare stoc minibaruri camere plecare, înregistrare pierderi și completări fizice.',
        taskType: 'Scheduled',
        assignedUserId: 'staff@hotel.com',
        dueDate: '2026-06-02',
        dueTime: '06:30', // Earlier time on 2026-06-02 to trigger Overdue
        status: 'Pending',
        department: 'Housekeeping'
      },
      {
        id: 'task-inst-5',
        title: 'One-time: Curățare chimică mochetă recepție',
        description: 'Sesiune programată de curățare profundă tapițerie și mochete din zona de primire.',
        taskType: 'Scheduled',
        assignedUserId: 'staff@hotel.com',
        dueDate: '2026-06-04', // Later this week
        dueTime: '18:00',
        status: 'Pending',
        department: 'Maintenance'
      }
    ];
  });

  const [completions, setCompletions] = useState<AppTaskCompletion[]>(() => {
    const saved = localStorage.getItem('efactura_app_completions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          return parsed.filter(item => {
            if (!item || !item.id) return false;
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });
        }
      } catch (e) {}
    }

    // Pre-seeded completions matching the pre-seeded tasks
    return [
      {
        id: 'comp-1',
        taskId: 'task-inst-1',
        completedBy: 'Elena Popescu',
        completionTime: '07:22',
        notes: 'Toate tăvile calde sunt alimentate, sucurile sunt la rece. Totul este pregătit pentru clienți.',
        photoUrl: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=400&auto=format&fit=crop&q=60&referrerPolicy=no-referrer'
      }
    ];
  });

  // Pre-seeded recurring templates managed by Manager
  const [recurringTemplates, setRecurringTemplates] = useState<Partial<AppTask>[]>(() => {
    const saved = localStorage.getItem('efactura_app_recurring_templates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          return parsed.filter(item => {
            if (!item || !item.id) return false;
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });
        }
      } catch (e) {}
    }

    return [
      {
        id: 'tpl-1',
        title: 'Pregătire Mic Dejun Buffet',
        description: 'Alimentare bufet cald și rece, verificare temperaturi mâncare servită clienților.',
        taskType: 'Recurring',
        recurrencePattern: 'Daily',
        assignedUserId: 'staff@hotel.com',
        dueTime: '07:30',
        department: 'Mâncare & Restaurant'
      },
      {
        id: 'tpl-2',
        title: 'Igienizare Standard Recurentă Camere',
        description: 'Curățenie de plecare și primenire lenjerii curate pentru etajele 1 și 2.',
        taskType: 'Recurring',
        recurrencePattern: 'Daily',
        assignedUserId: 'staff@hotel.com',
        dueTime: '11:00',
        department: 'Housekeeping'
      },
      {
        id: 'tpl-3',
        title: 'Audit Presiune Valve Centrală Termică',
        description: 'Măsurare presiune cazane apă caldă și raportare valori în registrul de siguranță.',
        taskType: 'Recurring',
        recurrencePattern: 'Weekly',
        assignedUserId: 'staff@hotel.com',
        dueTime: '14:00',
        department: 'Mentenanță'
      }
    ];
  });

  // Manager alert notifications system
  const [notifications, setNotifications] = useState<{
    id: string;
    text: string;
    timestamp: string;
    read: boolean;
    type: 'completion' | 'assignment' | 'overdue';
  }[]>(() => {
    const saved = localStorage.getItem('efactura_app_notifications');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          return parsed.filter(item => {
            if (!item || !item.id) return false;
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });
        }
      } catch (e) {}
    }

    return [
      {
        id: 'notif-1',
        text: 'Elena Popescu a finalizat sarcina "Pregătire Mic Dejun Buffet"',
        timestamp: '07:22',
        read: false,
        type: 'completion'
      }
    ];
  });

  // Automation audit history logs (showing when recurrences were instantiated)
  const [automationLogs, setAutomationLogs] = useState<{
    id: string;
    timestamp: string;
    dateGeneratedFor: string;
    countGenerated: number;
    log: string;
  }[]>(() => {
    const saved = localStorage.getItem('efactura_app_automation_logs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          return parsed.filter(item => {
            if (!item || !item.id) return false;
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });
        }
      } catch (e) {}
    }

    return [
      {
        id: 'auto-log-1',
        timestamp: '2026-06-02 06:00:02',
        dateGeneratedFor: '2026-06-02',
        countGenerated: 3,
        log: 'Morning Service run at 6:00 AM automatically generated 3 recurring tasks for 2026-06-02 and dispatched notification alerts to staff members.'
      }
    ];
  });

  // Local state managers
  const [filterTab, setFilterTab] = useState<'Today' | 'ThisWeek' | 'Completed' | 'Pending'>('Today');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');

  // Creation States
  const [formType, setFormType] = useState<'Recurring' | 'Scheduled'>('Recurring');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDepartment, setNewDepartment] = useState('Housekeeping');
  const [newAssignedUser, setNewAssignedUser] = useState('staff@hotel.com');
  const [newRecurrencePattern, setNewRecurrencePattern] = useState<'Daily' | 'Weekly'>('Daily');
  const [newDueTime, setNewDueTime] = useState('09:00');
  const [newScheduledDate, setNewScheduledDate] = useState('2026-06-02');

  // Staff completion action states
  const [selectedStaffTask, setSelectedStaffTask] = useState<AppTask | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionPhotoUrl, setCompletionPhotoUrl] = useState('');

  // Update localStorage whenever states change
  useEffect(() => {
    localStorage.setItem('efactura_app_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('efactura_app_completions', JSON.stringify(completions));
  }, [completions]);

  useEffect(() => {
    localStorage.setItem('efactura_app_recurring_templates', JSON.stringify(recurringTemplates));
  }, [recurringTemplates]);

  useEffect(() => {
    localStorage.setItem('efactura_app_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('efactura_app_automation_logs', JSON.stringify(automationLogs));
  }, [automationLogs]);

  // Real-time synchronization with Firebase Cloud Firestore for Tasks & Checklists
  useEffect(() => {
    if (!activeUser || !firebaseReady) return;

    // 1. Tasks Sync
    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      const list: AppTask[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as AppTask);
      });
      if (list.length > 0) {
        setTasks((prev) => {
          const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
          const sortedList = [...list].sort((a, b) => a.id.localeCompare(b.id));
          if (JSON.stringify(sortedPrev) === JSON.stringify(sortedList)) return prev;
          return list;
        });
      } else {
        // Seed default Tasks representing exact realistic hotel entries
        const defaultTasks: AppTask[] = [
          {
            id: 'task-inst-1',
            title: 'Pregătire Mic Dejun Buffet',
            description: 'Alimentare bufet cald și rece, verificare temperaturi mâncare servită clienților.',
            taskType: 'Recurring',
            recurrencePattern: 'Daily',
            assignedUserId: 'staff@hotel.com',
            dueDate: '2026-06-02',
            dueTime: '07:30',
            status: 'Completed',
            department: 'Mâncare & Restaurant'
          },
          {
            id: 'task-inst-2',
            title: 'Igienizare Standard Recurentă Camere',
            description: 'Curățenie de plecare și primenire lenjerii curate pentru etajele 1 și 2.',
            taskType: 'Recurring',
            recurrencePattern: 'Daily',
            assignedUserId: 'staff@hotel.com',
            dueDate: '2026-06-02',
            dueTime: '11:00',
            status: 'In Progress',
            department: 'Housekeeping'
          },
          {
            id: 'task-inst-3',
            title: 'Audit Presiune Valve Centrală Termică',
            description: 'Măsurare presiune cazane apă caldă și raportare valori în registrul de siguranță.',
            taskType: 'Recurring',
            recurrencePattern: 'Weekly',
            assignedUserId: 'staff@hotel.com',
            dueDate: '2026-06-02',
            dueTime: '14:00',
            status: 'Pending',
            department: 'Mentenanță'
          },
          {
            id: 'task-inst-4',
            title: 'Inventar Urgent Minibar & Cosmetice lobby',
            description: 'Numărare stoc minibaruri camere plecare, înregistrare pierderi și completări fizice.',
            taskType: 'Scheduled',
            assignedUserId: 'staff@hotel.com',
            dueDate: '2026-06-02',
            dueTime: '06:30',
            status: 'Pending',
            department: 'Housekeeping'
          },
          {
            id: 'task-inst-5',
            title: 'One-time: Curățare chimică mochetă recepție',
            description: 'Sesiune programată de curățare profundă tapițerie și mochete din zona de primire.',
            taskType: 'Scheduled',
            assignedUserId: 'staff@hotel.com',
            dueDate: '2026-06-04',
            dueTime: '18:00',
            status: 'Pending',
            department: 'Maintenance'
          }
        ];
        defaultTasks.forEach(async (t) => {
          try {
            await setDoc(doc(db, 'tasks', t.id), t);
          } catch (e) {
            console.error('Seed error tasks:', e);
          }
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tasks');
    });

    // 2. Completions Sync
    const unsubCompletions = onSnapshot(collection(db, 'completions'), (snapshot) => {
      const list: AppTaskCompletion[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as AppTaskCompletion);
      });
      if (list.length > 0) {
        setCompletions((prev) => {
          const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
          const sortedList = [...list].sort((a, b) => a.id.localeCompare(b.id));
          if (JSON.stringify(sortedPrev) === JSON.stringify(sortedList)) return prev;
          return list;
        });
      } else {
        const defaultCompletions: AppTaskCompletion[] = [
          {
            id: 'comp-1',
            taskId: 'task-inst-1',
            completedBy: 'Elena Popescu',
            completionTime: '07:22',
            notes: 'Toate tăvile calde sunt alimentate, sucurile sunt la rece. Totul este pregătit pentru clienți.',
            photoUrl: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=400&auto=format&fit=crop&q=60&referrerPolicy=no-referrer'
          }
        ];
        defaultCompletions.forEach(async (c) => {
          try {
            await setDoc(doc(db, 'completions', c.id), c);
          } catch (e) {
            console.error('Seed error completions:', e);
          }
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'completions');
    });

    // 3. Recurring Templates Sync
    const unsubTemplates = onSnapshot(collection(db, 'recurringTemplates'), (snapshot) => {
      const list: Partial<AppTask>[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as Partial<AppTask>);
      });
      if (list.length > 0) {
        setRecurringTemplates((prev) => {
          const sortedPrev = [...prev].sort((a, b) => (a.id || '').localeCompare(b.id || ''));
          const sortedList = [...list].sort((a, b) => (a.id || '').localeCompare(b.id || ''));
          if (JSON.stringify(sortedPrev) === JSON.stringify(sortedList)) return prev;
          return list;
        });
      } else {
        const defaultTemplates = [
          {
            id: 'tpl-1',
            title: 'Pregătire Mic Dejun Buffet',
            description: 'Alimentare bufet cald și rece, verificare temperaturi mâncare servită clienților.',
            taskType: 'Recurring' as const,
            recurrencePattern: 'Daily' as const,
            assignedUserId: 'staff@hotel.com',
            dueTime: '07:30',
            department: 'Mâncare & Restaurant'
          },
          {
            id: 'tpl-2',
            title: 'Igienizare Standard Recurentă Camere',
            description: 'Curățenie de plecare și primenire lenjerii curate pentru etajele 1 și 2.',
            taskType: 'Recurring' as const,
            recurrencePattern: 'Daily' as const,
            assignedUserId: 'staff@hotel.com',
            dueTime: '11:00',
            department: 'Housekeeping'
          },
          {
            id: 'tpl-3',
            title: 'Audit Presiune Valve Centrală Termică',
            description: 'Măsurare presiune cazane apă caldă și raportare valori în registrul de siguranță.',
            taskType: 'Recurring' as const,
            recurrencePattern: 'Weekly' as const,
            assignedUserId: 'staff@hotel.com',
            dueTime: '14:00',
            department: 'Mentenanță'
          }
        ];
        defaultTemplates.forEach(async (tpl) => {
          try {
            await setDoc(doc(db, 'recurringTemplates', tpl.id), tpl);
          } catch (e) {
            console.error('Seed error recurringTemplates:', e);
          }
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'recurringTemplates');
    });

    // 4. Notifications Sync
    const unsubNotifications = onSnapshot(collection(db, 'notifications'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((d) => {
        list.push(d.data());
      });
      if (list.length > 0) {
        setNotifications((prev) => {
          const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
          const sortedList = [...list].sort((a, b) => a.id.localeCompare(b.id));
          if (JSON.stringify(sortedPrev) === JSON.stringify(sortedList)) return prev;
          return list;
        });
      } else {
        const defaultNotifs = [
          {
            id: 'notif-1',
            text: 'Elena Popescu a finalizat sarcina "Pregătire Mic Dejun Buffet"',
            timestamp: '07:22',
            read: false,
            type: 'completion'
          }
        ];
        defaultNotifs.forEach(async (n) => {
          try {
            await setDoc(doc(db, 'notifications', n.id), n);
          } catch (e) {
            console.error('Seed error notifications:', e);
          }
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    // 5. Automation Logs Sync
    const unsubAutoLogs = onSnapshot(collection(db, 'automationLogs'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((d) => {
        list.push(d.data());
      });
      if (list.length > 0) {
        setAutomationLogs((prev) => {
          const sortedPrev = [...prev].sort((a, b) => a.id.localeCompare(b.id));
          const sortedList = [...list].sort((a, b) => a.id.localeCompare(b.id));
          if (JSON.stringify(sortedPrev) === JSON.stringify(sortedList)) return prev;
          return list;
        });
      } else {
        const defaultAutoLogs = [
          {
            id: 'auto-log-1',
            timestamp: '2026-06-02 06:00:02',
            dateGeneratedFor: '2026-06-02',
            countGenerated: 3,
            log: 'Morning Service run at 6:00 AM automatically generated 3 recurring tasks for 2026-06-02 and dispatched notification alerts to staff members.'
          }
        ];
        defaultAutoLogs.forEach(async (log) => {
          try {
            await setDoc(doc(db, 'automationLogs', log.id), log);
          } catch (e) {
            console.error('Seed error automationLogs:', e);
          }
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'automationLogs');
    });

    return () => {
      unsubTasks();
      unsubCompletions();
      unsubTemplates();
      unsubNotifications();
      unsubAutoLogs();
    };
  }, [activeUser, firebaseReady]);

  // Compute stats based on selected/current date
  const selectedDateTasks = tasks.filter(t => t.dueDate === globalDate);

  // Auto-overdue checker: If a task's date is today (or past) and not completed, check if current time is after dueTime.
  useEffect(() => {
    const interval = setInterval(() => {
      let changed = false;
      
      const now = new Date();
      const currentHour = String(now.getHours()).padStart(2, '0');
      const currentMin = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHour}:${currentMin}`;

      const updated = tasks.map(t => {
        if (t.status !== 'Completed' && t.status !== 'Overdue') {
          // Parse due date and dueTime
          const isPastDate = t.dueDate < globalDate;
          const isTodayAndPastTime = t.dueDate === globalDate && t.dueTime <= currentTimeStr;
          if (isPastDate || isTodayAndPastTime) {
            changed = true;
            // Append a notification for staff about overdue task
            const taskLabel = t.title || t.description.substring(0, 20);
            setNotifications(prev => {
              const uniqueId = `notif-overdue-${t.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
              if (prev.some(n => n.id === uniqueId || n.text.includes(taskLabel))) return prev;
              return [
                {
                  id: uniqueId,
                  text: `Sarcina restantă depășită: "${taskLabel}" (Termen limită: ${t.dueTime} pe ${t.dueDate})`,
                  timestamp: 'Acum',
                  read: false,
                  type: 'overdue'
                },
                ...prev
              ];
            });
            return { ...t, status: 'Overdue' as const };
          }
        }
        return t;
      });

      if (changed) {
        setTasks(updated);
      }
    }, 12000); // Check periodically
    return () => clearInterval(interval);
  }, [tasks, globalDate]);

  // AUTOMATION TRIGGER: Every morning at 6:00 AM automatically generate recurring daily tasks
  // To facilitate user interaction in the preview frame, we check if the selectedDate tasks have been generated.
  // If no recurring tasks exist for this selected date, we automatically trigger the 6:00 AM generator logic!
  useEffect(() => {
    const hasGeneratedToday = automationLogs.some(log => log.dateGeneratedFor === globalDate);
    if (!hasGeneratedToday) {
      handleRunMorningAutomation(false); // run quietly on initial load for the selected date
    }
  }, [globalDate]);

  const handleRunMorningAutomation = (manualClick: boolean = true) => {
    // 1. Find all active recurring templates
    const templatesToInstantiate = recurringTemplates;
    if (templatesToInstantiate.length === 0) return;

    // Filter which ones apply (Daily applies always. Weekly applies on specific days, let's instantiate all matching daily and weekly for the simulation)
    const newInstances: AppTask[] = [];
    templatesToInstantiate.forEach((tpl, idx) => {
      // Check if this task already has an instance generated for this date
      const alreadyExists = tasks.some(t => t.dueDate === globalDate && t.title === tpl.title);
      if (!alreadyExists) {
        const randomStr = Math.random().toString(36).substring(2, 9);
        newInstances.push({
          id: `task-gen-${globalDate}-${tpl.id || idx}-${Date.now()}-${randomStr}`,
          title: tpl.title || 'Sarcina recurentă',
          description: tpl.description || '',
          taskType: 'Recurring',
          recurrencePattern: tpl.recurrencePattern as any || 'Daily',
          assignedUserId: tpl.assignedUserId || 'staff@hotel.com',
          dueDate: globalDate,
          dueTime: tpl.dueTime || '08:00',
          status: 'Pending',
          department: tpl.department || 'Housekeeping'
        });
      }
    });

    if (newInstances.length > 0) {
      setTasks(prev => {
        const filteredNew = newInstances.filter(n => !prev.some(p => p.dueDate === n.dueDate && p.title === n.title));
        if (filteredNew.length === 0) return prev;
        return [...prev, ...filteredNew];
      });
      newInstances.forEach(n => {
        setDoc(doc(db, 'tasks', n.id), n).catch(e => console.error(e));
      });
      
      // Send notifications to staff that new tasks are assigned
      setNotifications(prev => {
        const text = `Generare Automată 6:00 AM: Au fost generate și atribuite active ${newInstances.length} sarcini recurente pentru ziua de astăzi.`;
        if (prev.some(n => n.text === text)) return prev;
        const uniqueId = `notif-auto-assign-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const newNotif = {
          id: uniqueId,
          text,
          timestamp: '06:00',
          read: false,
          type: 'assignment' as const
        };
        setDoc(doc(db, 'notifications', uniqueId), newNotif).catch(e => console.error(e));
        return [newNotif, ...prev];
      });
    }

    // Add automation log
    const timestampStr = `${globalDate} 06:00:00`;
    setAutomationLogs(prev => {
      if (prev.some(log => log.dateGeneratedFor === globalDate)) {
        return prev;
      }
      const uniqueId = `auto-log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newLog = {
        id: uniqueId,
        timestamp: timestampStr,
        dateGeneratedFor: globalDate,
        countGenerated: newInstances.length > 0 ? newInstances.length : templatesToInstantiate.length,
        log: `Morning Automation Service ran successfully. Processed templates and generated tasks for date ${globalDate}. Sent task digests to assigned staff.`
      };
      setDoc(doc(db, 'automationLogs', uniqueId), newLog).catch(e => console.error(e));
      return [newLog, ...prev];
    });

    if (manualClick) {
      alert(lang === 'RO' 
        ? `Serviciul de dimineață de la ora 06:00 AM a rulat cu succes pentru data ${globalDate}! S-au verificat șabloanele active și s-au generat activitățile aferente.` 
        : `Morning 06:00 AM worker service generated recurrences for ${globalDate} successfully!`);
    }
  };

  // Create client-side simulated WhatsApp / Direct Alert triggering helper
  const triggerNotification = (text: string, type: 'completion' | 'assignment' | 'overdue') => {
    const timeNow = new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
    const uniqueId = `notif-user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newNotif = {
      id: uniqueId,
      text,
      timestamp: timeNow,
      read: false,
      type
    };

    setNotifications(prev => [newNotif, ...prev]);
    setDoc(doc(db, 'notifications', uniqueId), newNotif).catch(e => console.error(e));
  };

  // Manager Feature: Create Recurring Task Template
  const handleCreateRecurringTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) {
      alert(lang === 'RO' ? 'Vă rugăm adăugați titlu și descriere!' : 'Please add a valid title and description!');
      return;
    }

    const uniqueTplId = `tpl-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newTpl: Partial<AppTask> = {
      id: uniqueTplId,
      title: newTitle,
      description: newDesc,
      taskType: 'Recurring',
      recurrencePattern: newRecurrencePattern as any,
      assignedUserId: newAssignedUser,
      dueTime: newDueTime,
      department: newDepartment
    };

    setRecurringTemplates(prev => [newTpl, ...prev]);
    setDoc(doc(db, 'recurringTemplates', uniqueTplId), newTpl).catch(e => console.error(e));

    // Also instantiate it immediately for today if requested
    const instantConfirm = safeConfirm(lang === 'RO' 
      ? 'Doriți să generați această activitate recurentă și direct în calendarul de astăzi?' 
      : 'Would you like to instantly generate an instance of this recurring task for today\'s table?');
    
    if (instantConfirm) {
      const randomStr = Math.random().toString(36).substring(2, 9);
      const newInst: AppTask = {
        id: `task-gen-${globalDate}-${newTpl.id}-${Date.now()}-${randomStr}`,
        title: newTitle,
        description: newDesc,
        taskType: 'Recurring',
        recurrencePattern: newRecurrencePattern as any,
        assignedUserId: newAssignedUser,
        dueDate: globalDate,
        dueTime: newDueTime,
        status: 'Pending',
        department: newDepartment
      };
      setTasks(prev => [newInst, ...prev]);
      setDoc(doc(db, 'tasks', newInst.id), newInst).catch(e => console.error(e));
      triggerNotification(`S-a adăugat o nouă sarcină recurentă și s-a generat o instanță pentru astăzi.`, 'assignment');
    } else {
      triggerNotification(`Șablonul recurent "${newTitle}" a fost înregistrat în librăria managerului.`, 'assignment');
    }

    // Reset Form
    setNewTitle('');
    setNewDesc('');
    alert(lang === 'RO' ? 'Sarcina recurentă a fost creată!' : 'Recurring task template created!');
  };

  // Manager Feature: Create One-Time Scheduled Task
  const handleCreateOneTimeTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) {
      alert(lang === 'RO' ? 'Vă rugăm adăugați titlu și descriere!' : 'Please add a valid title and description!');
      return;
    }

    const randomStr = Math.random().toString(36).substring(2, 9);
    const newInst: AppTask = {
      id: `task-one-${Date.now()}-${randomStr}`,
      title: newTitle,
      description: newDesc,
      taskType: 'Scheduled',
      assignedUserId: newAssignedUser,
      dueDate: newScheduledDate,
      dueTime: newDueTime,
      status: 'Pending',
      department: newDepartment
    };

    setTasks(prev => [newInst, ...prev]);
    setDoc(doc(db, 'tasks', newInst.id), newInst).catch(e => console.error(e));
    triggerNotification(`Nouă activitate programată pe data: ${newScheduledDate} atibuită către: ${newAssignedUser}`, 'assignment');

    // Reset Form
    setNewTitle('');
    setNewDesc('');
    alert(lang === 'RO' ? 'Sarcina programată unică a fost înregistrată!' : 'Scheduled task registered successfully!');
  };

  // Delete Template Task
  const handleDeleteTemplate = (id: string) => {
    if (safeConfirm(lang === 'RO' ? 'Sigur ștergeți acest șablon?' : 'Are you sure you want to delete this template?')) {
      setRecurringTemplates(prev => prev.filter(t => t.id !== id));
      deleteDoc(doc(db, 'recurringTemplates', id)).catch(e => console.error(e));
    }
  };

  // Delete Task Instance
  const handleDeleteInstance = (id: string) => {
    if (safeConfirm(lang === 'RO' ? 'Sigur ștergeți această activitate instanțiată?' : 'Are you sure you want to delete this task instance?')) {
      setTasks(prev => prev.filter(t => t.id !== id));
      deleteDoc(doc(db, 'tasks', id)).catch(e => console.error(e));
      setCompletions(prev => {
        const matching = prev.filter(c => c.taskId === id);
        matching.forEach(c => {
          deleteDoc(doc(db, 'completions', c.id)).catch(e => console.error(e));
        });
        return prev.filter(c => c.taskId !== id);
      });
    }
  };

  // Staff Feature: Update Selected Task status
  const handleUpdateStatus = (taskId: string, targetStatus: 'Pending' | 'In Progress' | 'Completed') => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const updated = { ...t, status: targetStatus };
        setDoc(doc(db, 'tasks', taskId), updated).catch(e => console.error(e));
        return updated;
      }
      return t;
    }));
  };

  // Staff Feature: Submit entire Completion Log with notes and upload mockup
  const handleCompleteTaskWithValidation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffTask) return;
    if (!completionNotes.trim()) {
      alert(lang === 'RO' ? 'Vă rugăm să adăugați câteva note justificative despre finalizare.' : 'Please add completion notes.');
      return;
    }

    const timeString = new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });

    const randomStr = Math.random().toString(36).substring(2, 9);
    const newCompletionLog: AppTaskCompletion = {
      id: `comp-inst-${Date.now()}-${randomStr}`,
      taskId: selectedStaffTask.id,
      completedBy: activeUser.fullName,
      completionTime: timeString,
      notes: completionNotes,
      photoUrl: completionPhotoUrl || undefined
    };

    // Update completions
    setCompletions(prev => [newCompletionLog, ...prev]);
    setDoc(doc(db, 'completions', newCompletionLog.id), newCompletionLog).catch(e => console.error(e));

    // Update task instance status
    setTasks(prev => prev.map(t => {
      if (t.id === selectedStaffTask.id) {
        const updated = { ...t, status: 'Completed' as const };
        setDoc(doc(db, 'tasks', t.id), updated).catch(e => console.error(e));
        return updated;
      }
      return t;
    }));

    // Raise IMMEDIATE notification to Manager
    const staffName = activeUser.fullName;
    const taskTitle = selectedStaffTask.title;
    triggerNotification(`${staffName} a finalizat cu succes sarcina "${taskTitle}" la ora ${timeString}.`, 'completion');

    // Reset completion logs
    setSelectedStaffTask(null);
    setCompletionNotes('');
    setCompletionPhotoUrl('');

    alert(lang === 'RO' ? 'Sarcina a fost trimisă managerului spre verificare!' : 'Task submitted to manager!');
  };

  // Clear notifications helper
  const handleClearNotifications = () => {
    setNotifications([]);
    // Optionally wipe notifications in database if desired, or skip to keep it simple
  };

  // Check roles helper
  const isManager = activeUser.role === 'Manager' || activeUser.role === 'Operational Manager' || activeUser.role === 'Administrator';

  // Compute stats for current day (globalDate)
  const totalToday = selectedDateTasks.length;
  const completedToday = selectedDateTasks.filter(t => t.status === 'Completed').length;
  const pendingToday = selectedDateTasks.filter(t => t.status === 'Pending').length;
  const inProgressToday = selectedDateTasks.filter(t => t.status === 'In Progress').length;
  const overdueToday = selectedDateTasks.filter(t => t.status === 'Overdue').length;

  // Week helper calculations
  const getWeekRangeTasks = () => {
    return tasks; // Simple representation of all current week tasks for testing tabular listings
  };

  // Filter lists based on tab
  const getFilteredTaskList = () => {
    let list = tasks;

    // 1. Search term match
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }

    // 2. Department match
    if (selectedDepartment !== 'ALL') {
      list = list.filter(t => t.department === selectedDepartment);
    }

    // 3. Tab filter
    if (filterTab === 'Today') {
      list = list.filter(t => t.dueDate === globalDate);
    } else if (filterTab === 'ThisWeek') {
      // Just list all scheduled items for visual completeness
      list = list.filter(t => t.dueDate >= globalDate || t.dueDate <= '2026-06-08');
    } else if (filterTab === 'Completed') {
      list = list.filter(t => t.status === 'Completed');
    } else if (filterTab === 'Pending') {
      list = list.filter(t => t.status === 'Pending' || t.status === 'In Progress');
    }

    // Sort by dueTime
    return list.sort((a, b) => a.dueTime.localeCompare(b.dueTime));
  };

  const filteredTasks = getFilteredTaskList();

  // Highlight badge helpers
  const getStatusBadge = (status: AppTask['status']) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-250 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            {lang === 'RO' ? 'Finalizată' : 'Completed'}
          </span>
        );
      case 'Overdue':
        return (
          <span className="bg-rose-50 text-rose-700 border border-rose-250 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
            {lang === 'RO' ? 'Depășită' : 'Overdue'}
          </span>
        );
      case 'In Progress':
        return (
          <span className="bg-indigo-50 text-indigo-700 border border-indigo-250 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
            {lang === 'RO' ? 'În Curs' : 'In Progress'}
          </span>
        );
      default:
        return (
          <span className="bg-amber-50 text-amber-700 border border-amber-250 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-amber-450 rounded-full" />
            {lang === 'RO' ? 'În Așteptare' : 'Pending'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 font-sans pb-12 select-none">
      
      {/* 1. TOP HEADER IDENTITY SECTION */}
      <div id="tasks-header-banner" className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-3xs">
        <div>
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 text-orange-600 animate-spin-slow" />
            SISTEM COORDONARE SERVICIU HOTELIER • RECURRENȚE
          </h2>
          <span className="text-xl font-extrabold tracking-tight text-slate-900 block mt-1.5">
            {isManager ? 'Panou Manager: Planificator Sarcini Recurente' : 'Panou Personal: Sarcini de Lucru în Curs'}
          </span>
          <span className="text-xs text-slate-450 font-medium block mt-0.5">
            Utilizator conectat: <strong className="text-slate-800">{activeUser.fullName}</strong> • Rol: <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-black text-[9px] uppercase border tracking-wider">{activeUser.role}</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="date"
              value={globalDate}
              disabled
              className="bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-xs font-bold font-mono text-slate-655 cursor-not-allowed opacity-80"
              title="Dată globală de lucru (se configurează din meniul principal)"
            />
            <Calendar className="w-4 h-4 text-slate-450 absolute right-3 top-2.5 pointer-events-none" />
          </div>

          <button
            type="button"
            onClick={() => handleRunMorningAutomation(true)}
            className="px-3 py-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-black flex items-center gap-1.5 transition active:scale-97 cursor-pointer"
            title="Simulează declanșarea automată de la 6:00 AM pentru generarea sarcinilor zilnice active"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
            <span>Simulează 6:00 AM Run</span>
          </button>
        </div>
      </div>

      {/* 2. MANAGER DASHBOARD METRICS */}
      {isManager && (
        <div id="manager-dashboard-kpis" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-3xs relative overflow-hidden transition hover:shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total sarcini astăzi</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-3xl font-black text-slate-900 leading-none">{totalToday}</span>
              <span className="text-xs text-slate-400 font-bold">{lang === 'RO' ? 'înregistrate' : 'tasks'}</span>
            </div>
            <div className="absolute right-4 bottom-4 text-slate-100 w-12 h-12 pointer-events-none stroke-1">
              <FileText className="w-12 h-12" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-3xs relative overflow-hidden transition hover:shadow-xs">
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block">Sarcini Finalizate</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-3xl font-black text-emerald-600 leading-none">{completedToday}</span>
              <span className="text-xs text-emerald-450 font-bold">({totalToday > 0 ? Math.round((completedToday/totalToday)*100) : 0}%)</span>
            </div>
            <div className="absolute right-4 bottom-4 text-emerald-50 w-12 h-12 pointer-events-none stroke-1">
              <CheckCircle className="w-12 h-12" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-3xs relative overflow-hidden transition hover:shadow-xs">
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block">Sarcini în Așteptare</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-3xl font-black text-amber-600 leading-none">{pendingToday}</span>
              {inProgressToday > 0 && (
                <span className="text-xs text-indigo-500 font-bold">({inProgressToday} în curs)</span>
              )}
            </div>
            <div className="absolute right-4 bottom-4 text-amber-50 w-12 h-12 pointer-events-none stroke-1">
              <Clock3 className="w-12 h-12" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-3xs relative overflow-hidden transition hover:shadow-xs">
            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest block">Sarcini restant depășite</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-3xl font-black text-rose-600 leading-none">{overdueToday}</span>
              <span className="text-[10px] bg-rose-50 border border-rose-100 text-rose-700 font-extrabold px-1.5 py-0.2 rounded uppercase animate-pulse">Overdue alert</span>
            </div>
            <div className="absolute right-4 bottom-4 text-rose-50 w-12 h-12 pointer-events-none stroke-1">
              <AlertCircle className="w-12 h-12" />
            </div>
          </div>
        </div>
      )}

      {/* 3. MANAGER NOTIFICATION ALERTS AREA */}
      {isManager && notifications.length > 0 && (
        <div id="manager-notifications-area" className="bg-emerald-50/50 border border-emerald-150 p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
            <span className="text-[11px] font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1">
              <Bell className="w-4 h-4 text-emerald-700 animate-bounce" />
              Notificări În Timp Real Sarcini Hotel (Instantly Notified)
            </span>
            <button
              onClick={handleClearNotifications}
              className="text-emerald-800 hover:text-emerald-950 text-[10px] font-bold underline transition cursor-pointer"
            >
              Clear Logs
            </button>
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {notifications.map((notif, idx) => (
              <div key={`${notif.id}-${idx}`} className="bg-white/70 border border-emerald-100 p-2.5 rounded-lg text-xs text-emerald-950 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[9px] mt-0.5">✓</div>
                  <div>
                    <span className="font-bold leading-relaxed">{notif.text}</span>
                    <span className="text-[9px] text-slate-450 block font-mono mt-0.5">Alertă recepționată la ora: {notif.timestamp} • Securizat</span>
                  </div>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-[8px] px-1 py-0.2 rounded font-black uppercase">Instant</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. MAIN TASK VIEWER & CONTROLS BENTO BOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Bento: Task List with tab controls & filter bars */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 md:p-6 shadow-3xs space-y-5">
          
          {/* Header toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-orange-600 rounded-full" />
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-550 header-heading">
                {isManager ? 'Registru Central Sarcini Hotel' : 'Sarcini Atribuite Camere'}
              </h3>
            </div>

            {/* Filter buttons */}
            <div className="bg-slate-100 p-0.5 rounded-lg flex items-center gap-1 text-[11px] font-heavy font-sans">
              <button
                onClick={() => setFilterTab('Today')}
                className={`px-3 py-1.5 rounded-md cursor-pointer transition ${filterTab === 'Today' ? 'bg-slate-900 text-white font-extrabold' : 'text-slate-600 hover:text-slate-950'}`}
              >
                {lang === 'RO' ? 'Astăzi' : 'Today'}
              </button>
              <button
                onClick={() => setFilterTab('ThisWeek')}
                className={`px-3 py-1.5 rounded-md cursor-pointer transition ${filterTab === 'ThisWeek' ? 'bg-slate-900 text-white font-extrabold' : 'text-slate-600 hover:text-slate-950'}`}
              >
                {lang === 'RO' ? 'Săptămână' : 'This Week'}
              </button>
              <button
                onClick={() => setFilterTab('Completed')}
                className={`px-3 py-1.5 rounded-md cursor-pointer transition ${filterTab === 'Completed' ? 'bg-slate-900 text-white font-extrabold' : 'text-slate-600 hover:text-slate-950'}`}
              >
                {lang === 'RO' ? 'Finalizate' : 'Completed'}
              </button>
              <button
                onClick={() => setFilterTab('Pending')}
                className={`px-3 py-1.5 rounded-md cursor-pointer transition ${filterTab === 'Pending' ? 'bg-slate-900 text-white font-extrabold' : 'text-slate-600 hover:text-slate-950'}`}
              >
                {lang === 'RO' ? 'În Așteptare' : 'Pending'}
              </button>
            </div>
          </div>

          {/* Search bar & Department dropdown list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
            <div className="relative">
              <input
                type="text"
                placeholder={lang === 'RO' ? 'Caută după titlu sau detalii...' : 'Search tasks...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-2 text-xs rounded-lg text-slate-700 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-orange-500 transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                aria-label="Filter department"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs rounded-lg text-slate-705 font-semibold focus:bg-white focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Departments</option>
                <option value="Housekeeping">Housekeeping</option>
                <option value="Mentenanță">Mentenanță</option>
                <option value="Mâncare & Restaurant">Mâncare & Restaurant</option>
                <option value="Front Desk">Front Desk</option>
              </select>
            </div>
          </div>

          {/* Sarcini actual view listing */}
          <div className="space-y-4 pt-2">
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => {
                // Find matching completions
                const compLog = completions.find(c => c.taskId === task.id);
                const isAssignedToThisStaff = !isManager && task.assignedUserId === activeUser.username;

                // Restrict: If not manager, staff can ONLY view tasks assigned to them specifically!
                if (!isManager && task.assignedUserId !== activeUser.username) {
                  return null;
                }

                return (
                  <div 
                    key={task.id} 
                    className="p-4 border border-slate-200 rounded-xl hover:border-slate-300 transition bg-slate-50/50 space-y-3 relative"
                  >
                    {/* Top title and status badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-xs sm:text-sm">{task.title}</span>
                          <span className="bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded font-black text-[9px] uppercase border tracking-wider">
                            {task.taskType}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 block font-bold font-mono mt-0.5">
                          Limita: <strong className="text-slate-800">{task.dueDate} • {task.dueTime}</strong>
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getStatusBadge(task.status)}
                        {/* Manager delete action */}
                        {isManager && (
                          <button
                            onClick={() => handleDeleteInstance(task.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition cursor-pointer"
                            title="Șterge sarcină definită"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-655 leading-relaxed font-semibold">
                      {task.description}
                    </p>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/50 text-[10px]">
                      <span className="bg-slate-100/85 text-slate-600 px-2 py-0.5 rounded-sm font-bold flex items-center gap-1 border">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        {task.department || 'Hotel'}
                      </span>
                      <span className="font-mono text-slate-500 flex items-center gap-1.5 font-bold">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        Staff: {task.assignedUserId}
                      </span>
                    </div>

                    {/* Staff status management commands */}
                    {isAssignedToThisStaff && task.status !== 'Completed' && (
                      <div className="bg-white border p-3 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 mt-3 shadow-3xs">
                        <div className="text-[11px] text-slate-500 font-bold">
                          Marchează progresul de lucru sau finalizează:
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          {task.status !== 'In Progress' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(task.id, 'In Progress')}
                              className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-extrabold rounded-lg text-xs transition cursor-pointer flex-1"
                            >
                              🚀 În Curs (In Progress)
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStaffTask(task);
                              setCompletionNotes('');
                              setCompletionPhotoUrl('');
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-heavy rounded-lg text-xs transition cursor-pointer flex-1 flex items-center justify-center gap-1 uppercase tracking-wide"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Finalizează
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Completion Log summary displaying if final completion is set */}
                    {compLog && (
                      <div className="bg-emerald-50/50 border border-emerald-150 p-3 rounded-lg space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-black text-emerald-800 tracking-wider flex items-center gap-1">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            Raport Justificativ Lucru Finalizat
                          </span>
                          <span className="font-mono font-bold text-slate-500 text-[10px]">
                            Ora: {compLog.completionTime}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 italic leading-relaxed font-semibold">
                          &ldquo;{compLog.notes}&rdquo;
                        </p>
                        {compLog.photoUrl && (
                          <div className="pt-1 select-none">
                            <img 
                              src={compLog.photoUrl} 
                              alt="Dovadă foto finalizare" 
                              referrerPolicy="no-referrer"
                              className="max-h-28 rounded-lg object-cover border border-emerald-200 shadow-3xs hover:scale-102 transition" 
                            />
                            <span className="text-[9px] text-slate-400 block mt-1 font-mono">📸 Dovadă vizuală atașată de {compLog.completedBy}</span>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center text-slate-400 italic text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/20 font-sans">
                Nu există nicio activitate atribuită conform filtrelor alese.
              </div>
            )}
          </div>

        </div>

        {/* Right Bento: Actions / Creation panel for Managers OR completion setup for Staff */}
        <div className="lg:col-span-4 space-y-8 select-none">
          
          {/* STAFF: MODAL/BOX TO ENTER COMPLETION DETAILS */}
          {selectedStaffTask && (
            <div id="staff-completion-form" className="bg-white border-2 border-emerald-500 rounded-xl p-5 md:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b pb-2.5">
                <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1">
                  <CheckCircle2 className="w-5 h-5 text-emerald-650 animate-bounce" />
                  Finalizează: {selectedStaffTask.title}
                </h3>
                <button 
                  onClick={() => setSelectedStaffTask(null)}
                  className="text-slate-400 hover:text-slate-900 border hover:bg-slate-50 p-1 rounded-full w-6 h-6 flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCompleteTaskWithValidation} className="space-y-4 text-xs">
                
                <div className="space-y-1">
                  <label htmlFor="comp-notes" className="font-extrabold text-slate-500 block tracking-wide uppercase text-[10px]">
                    Note de Finalizare & Justificări *
                  </label>
                  <textarea
                    id="comp-notes"
                    required
                    rows={3}
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    placeholder="Alimentează detalii despre rezultate (ex. s-a aerisit camera, totul e curat, minibar completat...)"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-emerald-500 rounded-lg p-2.5 transition leading-relaxed"
                  />
                </div>

                <div className="space-y-2 select-none">
                  <label className="font-extrabold text-slate-500 block tracking-wide uppercase text-[10px]">
                    📸 Dovadă Foto Finalizare (Opțional)
                  </label>
                  
                  {/* Select Mock Photo Preset for easy demo assessment */}
                  <span className="text-[9.5px] text-slate-450 block -mt-1 leading-normal">
                    Selectează o imagine de dovadă Horeca de mai jos pentru simulare:
                  </span>
                  
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {PRESET_PROOF_PHOTOS.map(img => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => setCompletionPhotoUrl(img.url)}
                        className={`p-1 bg-slate-50 border rounded-lg hover:border-emerald-500 hover:bg-emerald-50/30 transition text-left cursor-pointer ${completionPhotoUrl === img.url ? 'border-2 border-emerald-600 bg-emerald-55/40 font-bold' : 'border-slate-200'}`}
                      >
                        <img 
                          src={img.url} 
                          alt={img.name} 
                          referrerPolicy="no-referrer"
                          className="h-10 w-full object-cover rounded-sm mb-1" 
                        />
                        <span className="text-[9px] block text-slate-600 truncate text-center font-semibold">{img.name}</span>
                      </button>
                    ))}
                  </div>

                  {completionPhotoUrl && (
                    <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                      <span className="text-emerald-700 text-[10px] font-black uppercase">Foto Selectat!</span>
                      <button
                        type="button"
                        onClick={() => setCompletionPhotoUrl('')}
                        className="text-[9.5px] text-rose-500 underline font-bold"
                      >
                        Clear photo
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-heavy uppercase tracking-wider py-2.5 rounded-lg transition shadow-md shadow-emerald-600/10 active:scale-97 cursor-pointer text-xs"
                >
                  Trimite Sarcina ca Finalizată
                </button>
              </form>
            </div>
          )}

          {/* MANAGER: CREATE TASKS SHUTTLE */}
          {isManager && (
            <div id="manager-creation-shuttle" className="bg-white border border-slate-200 rounded-xl p-5 md:p-6 shadow-3xs space-y-4">
              
              <div className="border-b pb-3">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                  <PlusCircle className="w-5 h-5 text-orange-600" />
                  Adaugă Sarcini Noi în Sistem
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">Stabilește responsabilitățile personalului recurent sau ca sarcini programate.</p>
              </div>

              {/* Toggle Form Type */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg text-xs font-black select-none">
                <button
                  type="button"
                  onClick={() => setFormType('Recurring')}
                  className={`py-1.5 rounded-md cursor-pointer text-center text-[10.5px] uppercase transition ${formType === 'Recurring' ? 'bg-white shadow-2xs text-slate-900 font-heavy' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  🔄 Recurente (Daily/Weekly)
                </button>
                <button
                  type="button"
                  onClick={() => setFormType('Scheduled')}
                  className={`py-1.5 rounded-md cursor-pointer text-center text-[10.5px] uppercase transition ${formType === 'Scheduled' ? 'bg-white shadow-2xs text-slate-900 font-heavy' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  📅 Programate (One-Time)
                </button>
              </div>

              {/* Creation Forms */}
              <form onSubmit={formType === 'Recurring' ? handleCreateRecurringTemplate : handleCreateOneTimeTask} className="space-y-4 text-xs font-sans">
                
                {/* Title */}
                <div className="space-y-1">
                  <label htmlFor="task-title" className="font-extrabold text-slate-500 block tracking-wide uppercase text-[9.5px]">
                    Titlu Militant Sarcina *
                  </label>
                  <input
                    id="task-title"
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="ex. Igienizare mochetă recepție"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-orange-500 rounded-lg p-2 transition font-semibold"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label htmlFor="task-desc" className="font-extrabold text-slate-500 block tracking-wide uppercase text-[9.5px]">
                    Detalii instrucțiuni specifice *
                  </label>
                  <textarea
                    id="task-desc"
                    required
                    rows={2}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Descrie în detaliu etapele și utilajele folosite..."
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-orange-500 rounded-lg p-2.5 transition leading-relaxed font-semibold"
                  />
                </div>

                {/* Team assignments Grid */}
                <div className="grid grid-cols-2 gap-3 pb-1">
                  <div className="space-y-1">
                    <label htmlFor="task-dept" className="font-extrabold text-slate-500 block tracking-wide uppercase text-[9.5px]">
                      Departament
                    </label>
                    <select
                      id="task-dept"
                      value={newDepartment}
                      onChange={(e) => setNewDepartment(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg font-semibold focus:bg-white cursor-pointer"
                    >
                      <option value="Housekeeping">Housekeeping</option>
                      <option value="Mentenanță">Mentenanță</option>
                      <option value="Mâncare & Restaurant">Mâncare & Restaurant</option>
                      <option value="Front Desk">Front Desk</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="task-assignee" className="font-extrabold text-slate-500 block tracking-wide uppercase text-[9.5px]">
                      Personal alocat
                    </label>
                    <select
                      id="task-assignee"
                      value={newAssignedUser}
                      onChange={(e) => setNewAssignedUser(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg font-semibold focus:bg-white cursor-pointer"
                    >
                      {users.map(u => (
                        <option key={u.username} value={u.username}>{u.fullName} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Recurring Options */}
                {formType === 'Recurring' ? (
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 border rounded-lg">
                    <div className="space-y-1">
                      <label htmlFor="tpl-pattern" className="font-extrabold text-slate-400 block tracking-wide text-[9px] uppercase">
                        Recurență
                      </label>
                      <select
                        id="tpl-pattern"
                        value={newRecurrencePattern}
                        onChange={(e) => setNewRecurrencePattern(e.target.value as any)}
                        className="w-full bg-white border border-slate-200 px-2 py-1.5 rounded-md font-bold cursor-pointer"
                      >
                        <option value="Daily">Daily (Zilnic)</option>
                        <option value="Weekly">Weekly (Săptămânal)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="tpl-time" className="font-extrabold text-slate-400 block tracking-wide text-[9px] uppercase">
                        Ora de executare
                      </label>
                      <input
                        id="tpl-time"
                        type="time"
                        value={newDueTime}
                        onChange={(e) => setNewDueTime(e.target.value)}
                        className="w-full bg-white border border-slate-200 p-1.5 rounded-md font-mono font-bold"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 border rounded-lg">
                    <div className="space-y-1">
                      <label htmlFor="sch-date" className="font-extrabold text-slate-400 block tracking-wide text-[9px] uppercase">
                        Data programării
                      </label>
                      <input
                        id="sch-date"
                        type="date"
                        value={newScheduledDate}
                        onChange={(e) => setNewScheduledDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 p-1.5 rounded-md font-mono font-heavy"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="sch-time" className="font-extrabold text-slate-400 block tracking-wide text-[9px] uppercase">
                        Ora limită datoria
                      </label>
                      <input
                        id="sch-time"
                        type="time"
                        value={newDueTime}
                        onChange={(e) => setNewDueTime(e.target.value)}
                        className="w-full bg-white border border-slate-200 p-1.5 rounded-md font-mono font-bold"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-550 text-white font-heavy uppercase tracking-wider py-2.5 rounded-lg transition shadow-md shadow-orange-600/10 active:scale-97 cursor-pointer text-[10.5px]"
                >
                  {formType === 'Recurring' ? 'Botează Șablon Recurent active' : 'Planifică Sarcina în Calendar'}
                </button>
              </form>
            </div>
          )}

          {/* MANAGER: ACTIVE RECURRING TEMPLATES LIBRARY */}
          {isManager && recurringTemplates.length > 0 && (
            <div id="manager-templates-library" className="bg-white border border-slate-200 rounded-xl p-5 shadow-3xs space-y-3 select-none">
              <span className="text-[10px] uppercase font-black text-slate-450 tracking-wider block flex items-center gap-1">
                <Users className="w-4 h-4 text-indigo-500" />
                Librăria Șabloane Recurente Active ({recurringTemplates.length})
              </span>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {recurringTemplates.map((tpl, idx) => (
                  <div key={`${tpl.id || 'tpl'}-${idx}`} className="bg-slate-50 hover:bg-slate-100 p-3 rounded-lg border flex items-start justify-between gap-3 text-xs">
                    <div>
                      <span className="font-extrabold text-slate-850 block">{tpl.title}</span>
                      <span className="text-[9.5px] text-indigo-700 block font-bold font-mono mt-0.5">
                        🔄 {tpl.recurrencePattern} la ora {tpl.dueTime} • {tpl.department}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteTemplate(tpl.id!)}
                      className="text-slate-450 hover:text-rose-600 p-1 rounded-full transition cursor-pointer"
                      title="Șterge șablon"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AUTOMATION JURNAL LOGS Area */}
          <div id="automation-audit-logs" className="bg-white border border-slate-200 rounded-xl p-5 shadow-3xs space-y-2.5">
            <span className="text-[10px] uppercase font-black text-slate-450 tracking-wider block flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              Jurnal Serviciu Automatizare 06:00 AM
            </span>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-[10.5px] leading-relaxed">
              {automationLogs.map((log, idx) => (
                <div key={`${log.id}-${idx}`} className="p-2 border-b border-slate-150/70 text-slate-600">
                  <div className="flex justify-between font-mono font-bold text-[9px] text-slate-400">
                    <span>{log.timestamp}</span>
                    <span className="text-emerald-600">{log.countGenerated} sarcini generate</span>
                  </div>
                  <p className="mt-1 text-slate-550 font-semibold">{log.log}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
