import { useState } from 'react';
import { MainQuest, Quest } from '@/app/types';

export function useQuestData() {
  const [mainQuest, setMainQuest] = useState<MainQuest>({
    title: "Wirehead - Week 2",
    progress: "20%",
    kanban: {
      ToDo: ["Zoom Meeting with Investors", "Set Up User Authentication"],
      InProgress: ["Get Feedback", "Get Database Up"],
      Done: ["Make UI Mockups"]
    }
  });

  const [quests, setQuests] = useState<Quest[]>([
    {
      id: 1,
      title: "Wirehead",
      isMain: true,  // Set initial main quest
      status: "Active",
      progress: "20%",
      shortDescription: "Build an AI-powered productivity assistant",
      questStatus: `[Entry #2077-14] 

The neon glow of multiple screens bathes our workspace in that familiar electric blue. You're hunched over a keyboard like a modern-day shaman, weaving code instead of spells. React Native and OpenAI - your digital totems, weapons of choice in this corporate jungle.
 
Chrome and silicon, that's our foundation. We've got the tech, we've got the vision. Each line of code we push is another brick in our digital fortress. But in this game, technical prowess alone won't cut it. The real challenge? Those AI integration paths, twisted like the back alleys of Night City. One wrong turn, and you're lost in a maze of dependencies and callbacks.

The market's hungry for AI companions - we can feel it in the digital pulse of the city. But we're not the only ones who smell the opportunity. The mega-corps are out there, their shadows long and dark, their resources endless. We need to be faster, smarter, more agile. Street smart beats corp power any day.

This isn't just about building another app. This is about revolution - about changing how people interface with their daily grind. First quarter of 2024, that's our window. Remote dev stations linked through the digital ether, each of us bringing our own flavor to the mix.

Current Status [20:47:13]:
Database scaffolding's taking shape, rising from the digital bedrock like a chrome spire. Potential investors circle like vultures - or maybe angels, hard to tell in this light. Next up: that authentication gateway. Gotta make it solid - in this city, data's worth more than gold.`,
      analysis: `<analysis>
  <swot>
    <strengths>Technical expertise, modern tech stack, innovative concept</strengths>
    <weaknesses>Complex AI integration, limited resources</weaknesses>
    <opportunities>Growing AI assistant market, increasing demand for productivity tools</opportunities>
    <threats>Competition from established companies, rapid tech changes</threats>
  </swot>
  <fiveWhoneH>
    <who>Three-person development team</who>
    <what>AI-powered productivity assistant application</what>
    <when>Q1 2024</when>
    <where>Remote development environment</where>
    <why>Transform personal productivity management</why>
    <how>React Native frontend, OpenAI integration</how>
  </fiveWhoneH>
  <currentFocus>
    <priority>Database infrastructure setup</priority>
    <nextStep>User authentication implementation</nextStep>
    <blockers>Investor feedback pending</blockers>
  </currentFocus>
</analysis>`,
      tasks: [
        { id: 2, title: "Get Feedback", scheduledFor: "Today 9PM", location: "Desktop PC", quest: "I, Robot" },
        { id: 4, title: "Get Database Up", scheduledFor: "Monday 9AM", location: "Desktop PC", quest: "I, Robot" },
        { id: 5, title: "Prepare Meeting with Investors", scheduledFor: "Tuesday 3PM", deadline: "Wednesday 3PM", location: "Desktop PC", quest: "I, Robot" },
        { id: 7, title: "Set Up User Authentication", scheduledFor: "Thursday 9PM", location: "Desktop PC", quest: "I, Robot" },
      ],
      kanban: mainQuest.kanban
    },
    {
      id: 2,
      title: "Could You Be Loved?",
      status: "Active",
      progress: "50%",
      shortDescription: "Improve relationship with Sam",
      questStatus: `[Personal Log: Night City Chronicles]

The city never sleeps, but sometimes it slows down just enough to let two people find each other in the chaos. Sam and I, we're like two functioning lines of code in this buggy matrix called life. Different processes, same runtime.

Our connection? It's got bandwidth, got signal strength. Pure digital chemistry. But time - that universal constant that even the best chrome can't hack - keeps throwing exceptions in our execution flow. Different schedules, different rhythms. Like trying to sync two systems running on different clocks.

Every meet-up is a commit to our shared repository. Coffee shops, park benches, quiet corners of the city where the neon doesn't reach - these are our merge points. Each successful date adds another node to our network, another layer to our encryption.

Tonight's another deployment. Not just about looking chrome - it's about creating space in the chaos, a buffer zone where the city's background processes can't interrupt. Every shared moment is a successful handshake, every laugh a packet of data that strengthens our connection.

Status Update [18:22:05]:
Romance in the age of chrome and neon. Still works the same as it did before the digital revolution. Just gotta keep the connection alive, keep the signals strong. One ping at a time.`,
      analysis: `<analysis>
  <swot>
    <strengths>Strong emotional connection, shared interests</strengths>
    <weaknesses>Scheduling conflicts, time management</weaknesses>
    <opportunities>Regular date nights, shared activities</opportunities>
    <threats>Work-life balance challenges</threats>
  </swot>
  <fiveWhoneH>
    <who>Sam and protagonist</who>
    <what>Relationship development</what>
    <when>Ongoing, with regular meetups</when>
    <where>Various date locations</where>
    <why>Build lasting relationship</why>
    <how>Regular communication and quality time</how>
  </fiveWhoneH>
  <currentFocus>
    <priority>Date night execution</priority>
    <nextStep>Planning future activities</nextStep>
    <blockers>Schedule coordination</blockers>
  </currentFocus>
</analysis>`,
      tasks: [
        { id: 1, title: "Get Ready for Date with Sam", scheduledFor: "Today 6PM", deadline: "Today 7:30PM", location: "Home", quest: "Could You Be Loved?" }
      ]
    },
    {
      id: 3,
      title: "Routine",
      status: "Active",
      progress: "75%",
      shortDescription: "Maintain daily and weekly routines",
      questStatus: `[System Maintenance Log: v3.158]

In this chrome-plated rat race, routine is the only code that runs without patches. My daily loops, my weekly iterations - they're the backbone processes keeping this human machine running optimal.

Years of debugging have refined these scripts. The system purrs like a well-maintained cyberdeck most days. But even the best code has its glitches - procrastination.exe is one persistent virus, always trying to inject itself into my runtime.

Each week's a new build, a chance to optimize these base functions. Finding those micro-optimizations, those milliseconds saved between processes. But the city's chaos is the ultimate penetration tester, always probing for weaknesses, looking for ways to crash the system.

Basic maintenance protocols might seem low-tech in a high-tech world, but they're what keeps us running. The laundry script's queued up for execution - another small but crucial routine in the bigger program. These mundane tasks, they're like the assembly code of life - not flashy, but fundamental.

Runtime Status [11:13:42]:
Sometimes the simplest scripts are the most crucial. While others chase the latest tech, I'm maintaining my base code. Because in this city of chrome and chaos, a stable system is worth more than the fanciest neural implant.`,
      analysis: `<analysis>
  <swot>
    <strengths>Established habits, consistent execution</strengths>
    <weaknesses>Occasional procrastination</weaknesses>
    <opportunities>Process optimization, time savings</opportunities>
    <threats>Unexpected schedule disruptions</threats>
  </swot>
  <fiveWhoneH>
    <who>Personal responsibility</who>
    <what>Daily and weekly maintenance tasks</what>
    <when>Recurring schedule</when>
    <where>Home environment</where>
    <why>Maintain order and productivity</why>
    <how>Systematic task management</how>
  </fiveWhoneH>
  <currentFocus>
    <priority>Weekly laundry routine</priority>
    <nextStep>Optimize task scheduling</nextStep>
    <blockers>None current</blockers>
  </currentFocus>
</analysis>`,
      tasks: [
        { id: 3, title: "Do Laundry", scheduledFor: "Tomorrow 11AM", deadline: "Tomorrow 4PM", location: "Home", quest: "Routine" }
      ]
    }
  ]);

  const setQuestAsMain = (questId: number) => {
    const newQuests = quests.map(q => ({
      ...q,
      isMain: q.id === questId
    }));
    setQuests(newQuests);

    const newMainQuest = newQuests.find(q => q.isMain);
    if (newMainQuest) {
      setMainQuest({
        title: newMainQuest.title,
        progress: newMainQuest.progress,
        kanban: newMainQuest.kanban || {
          ToDo: [],
          InProgress: [],
          Done: []
        }
      });
    }
  };

  return {
    mainQuest,
    quests,
    setQuestAsMain
  };
}
