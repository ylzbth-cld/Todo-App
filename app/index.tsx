import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList, Image, StyleSheet, Text, TextInput,
  TouchableOpacity, View
} from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [addTask, setAddTask] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tasks, setTasks] = useState([]);
  
  const [reminderDate, setReminderDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [hasReminder, setHasReminder] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted' && status !== 'undetermined') {
        Alert.alert('Permission Required', 'Enable notifications to use alarms!');
      }
    })();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const saved = await AsyncStorage.getItem("tasks");
      if (saved) setTasks(JSON.parse(saved));
    };
    loadData();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  const onDateChange = (event, selectedDate) => {
    setShowPicker(false);
    if (selectedDate) {
      setReminderDate(selectedDate);
      setHasReminder(true);
    }
  };

  const addTasks = async () => {
    if (title.trim()) {
      let notificationId = null;
      if (hasReminder && reminderDate > new Date()) {
        notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `⏰ Reminder: ${title}`,
            body: description || "You have a task to complete!",
          },
          trigger: reminderDate,
        });
      }

      const newTask = { 
        id: Date.now().toString(), 
        title, 
        description, 
        completed: false,
        reminder: hasReminder ? reminderDate.toISOString() : null,
        notificationId: notificationId
      };

      setTasks([...tasks, newTask]);
      setTitle("");
      setDescription("");
      setHasReminder(false);
      setAddTask(false);
    }
  };

  // RESTORED: Function to check/uncheck tasks
  const toggleTaskStatus = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  // RESTORED: Function to bring items back from Bin
  const restoreTask = (id) => {
    setTasks(tasks.map(t => {
      if (t.id === id) {
        const { deletedAt, ...rest } = t;
        return rest;
      }
      return t;
    }));
  };

  const deleteTask = async (id) => {
    const taskToDelete = tasks.find(t => t.id === id);
    if (taskToDelete?.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(taskToDelete.notificationId);
    }
    setTasks(tasks.map(t => t.id === id ? { ...t, deletedAt: Date.now() } : t));
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (category === "Bin") return task.deletedAt && matchesSearch;
    if (task.deletedAt) return false;
    if (category === "Active") return !task.completed && matchesSearch;
    if (category === "Completed") return task.completed && matchesSearch;
    return matchesSearch;
  });

  return (
    <View style={styles.container}>
      <View style={styles.navigation}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Image source={{ uri: "https://reactnative.dev/img/tiny_logo.png" }} style={{ width: 30, height: 30, marginRight: 10 }} />
          <Text style={{ color: "black", fontSize: 18, fontWeight: 'bold' }}>DoneWithIt</Text>
        </View>
        <TouchableOpacity style={styles.addTaskBtn} onPress={() => setAddTask(!addTask)}>
          <Text style={{ color: "white" }}>{addTask ? "Cancel" : "New Task"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <TextInput placeholder="Search..." value={searchQuery} onChangeText={setSearchQuery} style={styles.searchBar} />

        <View style={styles.categoryContainer}>
          {["All", "Active", "Completed", "Bin"].map((cat) => (
            <TouchableOpacity key={cat} onPress={() => setCategory(cat)} style={[styles.categoryBtn, category === cat && styles.activeCategory]}>
              <Text style={{ color: category === cat ? "white" : "#666" }}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {addTask && (
          <View style={styles.addTaskContainer}>
            <TextInput placeholder="Title" style={styles.inputTitle} value={title} onChangeText={setTitle} />
            <TextInput placeholder="Description" style={styles.inputDesc} multiline value={description} onChangeText={setDescription} />
            
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowPicker(true)}>
              <Text style={{ color: '#555' }}>
                {hasReminder ? `⏰ ${reminderDate.toLocaleString()}` : "Set Alarm Reminder"}
              </Text>
            </TouchableOpacity>

            {showPicker && (
              <DateTimePicker value={reminderDate} mode="datetime" display="default" onChange={onDateChange} minimumDate={new Date()} />
            )}

            <TouchableOpacity style={styles.button} onPress={addTasks}>
              <Text style={styles.buttonText}>Save Task with Alarm</Text>
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={[...filteredTasks].reverse()}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 20, color: '#aaa'}}>No tasks here.</Text>}
          renderItem={({ item }) => (
            <View style={[styles.taskRow, item.deletedAt && { opacity: 0.5 }]}>
              
              {/* RESTORED: The Checkbox/Circle Button */}
              {!item.deletedAt && (
                <TouchableOpacity
                  style={[styles.circle, item.completed && styles.circleChecked]}
                  onPress={() => toggleTaskStatus(item.id)}
                />
              )}

              <View style={{ flex: 1 }}>
                <Text style={[styles.taskTitle, item.completed && styles.taskDone]}>{item.title}</Text>
                <Text style={styles.taskDescription}>{item.description}</Text>
                {item.reminder && !item.deletedAt && (
                  <Text style={styles.reminderText}>🔔 {new Date(item.reminder).toLocaleString()}</Text>
                )}
              </View>

              {/* Action Buttons: Restore (for Bin) or Delete (for Active) */}
              {item.deletedAt ? (
                <TouchableOpacity onPress={() => restoreTask(item.id)}>
                  <Text style={{ color: '#007AFF', fontWeight: 'bold' }}>Restore</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => deleteTask(item.id)}>
                  <Text style={styles.deleteText}>🗑️</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 40 },
  navigation: { height: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 15, borderBottomWidth: 1, borderColor: "#eee" },
  addTaskBtn: { paddingVertical: 6, paddingHorizontal: 15, borderRadius: 5, backgroundColor: "#222" },
  content: { flex: 1, padding: 10 },
  searchBar: { height: 40, padding: 10, borderWidth: 1, borderColor: "#ccc", borderRadius: 5, marginBottom: 15 },
  categoryContainer: { flexDirection: "row", marginBottom: 20 },
  categoryBtn: { padding: 8, paddingHorizontal: 12, borderRadius: 5, marginRight: 8, backgroundColor: "#f0f0f0" },
  activeCategory: { backgroundColor: "#222" },
  addTaskContainer: { borderWidth: 1, borderColor: "#ccc", borderRadius: 5, padding: 10, marginBottom: 20 },
  inputTitle: { borderBottomWidth: 1, borderColor: "#eee", marginBottom: 10, padding: 5 },
  inputDesc: { height: 60, padding: 5 },
  dateBtn: { padding: 10, backgroundColor: '#f9f9f9', borderRadius: 5, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  button: { backgroundColor: "#222", padding: 10, borderRadius: 5, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "bold" },
  taskRow: { flexDirection: "row", alignItems: "center", padding: 15, borderBottomWidth: 1, borderColor: "#eee" },
  // RESTORED Circle Styles
  circle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#555", marginRight: 12 },
  circleChecked: { backgroundColor: "#555" },
  taskTitle: { fontWeight: "bold", fontSize: 16 },
  taskDescription: { fontSize: 12, color: "#666" },
  taskDone: { textDecorationLine: "line-through", color: "#aaa" },
  reminderText: { fontSize: 11, color: '#ff9500', marginTop: 4, fontWeight: 'bold' },
  deleteText: { fontSize: 18, marginLeft: 10 }
});