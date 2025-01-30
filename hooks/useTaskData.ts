import { useState, useRef } from 'react';
import { Animated } from 'react-native';

interface Task {
  id: number;
  title: string;
  scheduledFor: string;
  deadline?: string;
  location: string;
  quest: string;
}

export function useTaskData() {
  const [taskListVisible, setTaskListVisible] = useState(true);
  const animatedHeight = useRef(new Animated.Value(1)).current;
  const [tasks] = useState<Task[]>([
    { id: 1, title: "Get Ready for Date with Sam", scheduledFor: "Today 6PM", deadline: "Today 7:30PM", location: "Home", quest: "Could You Be Loved?" },
    { id: 2, title: "Get Feedback", scheduledFor: "Today 9PM", location: "Desktop PC", quest: "I, Robot" },
    { id: 3, title: "Do Laundry", scheduledFor: "Tomorrow 11AM", deadline: "Tomorrow 4PM", location: "Home", quest: "Routine" },
    { id: 4, title: "Get Database Up", scheduledFor: "Monday 9AM", location: "Desktop PC", quest: "I, Robot" },
    { id: 5, title: "Prepare Meeting with Investors", scheduledFor: "Tuesday 3PM", deadline: "Wednesday 3PM", location: "Desktop PC", quest: "I, Robot" },
    { id: 7, title: "Set Up User Authentication", scheduledFor: "Thursday 9PM", location: "Desktop PC", quest: "I, Robot" },
  ]);

  const toggleTaskList = () => {
    const toValue = taskListVisible ? 0 : 1;
    setTaskListVisible(!taskListVisible);
    
    Animated.timing(animatedHeight, {
      toValue: toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  return {
    tasks,
    taskListVisible,
    animatedHeight,
    toggleTaskList,
  };
}
