import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Keyboard,
  ScrollView,
  StatusBar,
  StyleSheet, Text, TextInput,
  TouchableOpacity, View
} from "react-native";

export default function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [addTask, setAddTask] = useState(false);
  const [title, setTitle] = useState("");
  const [tasks, setTasks] = useState([]);

  const [categories, setCategories] = useState([
    { name: "Work", color: "#780000" },
    { name: "Personal", color: "#C1121F" },
    { name: "Health", color: "#D4AF37" }
  ]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [taskCategory, setTaskCategory] = useState("Personal");
  const [activeTab, setActiveTab] = useState("All");

  // --- PERSISTENCE ---
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedTasks = await AsyncStorage.getItem("tasks");
        const savedCats = await AsyncStorage.getItem("categories");
        if (savedTasks) setTasks(JSON.parse(savedTasks));
        if (savedCats) setCategories(JSON.parse(savedCats));
      } finally { setIsLoaded(true); }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem("tasks", JSON.stringify(tasks));
      AsyncStorage.setItem("categories", JSON.stringify(categories));
    }
  }, [tasks, categories, isLoaded]);

  // --- LOGIC ---
  const addNewCategory = () => {
    if (!newCategoryName.trim()) return;
    if (categories.find(c => c.name.toLowerCase() === newCategoryName.toLowerCase())) {
      return Alert.alert("Note", "This category already exists.");
    }
    // Palette of Reds and Golds
    const palette = ["#780000", "#C1121F", "#D4AF37", "#B8860B", "#660708"];
    const randomColor = palette[Math.floor(Math.random() * palette.length)];
    setCategories([...categories, { name: newCategoryName.trim(), color: randomColor }]);
    setNewCategoryName("");
    Keyboard.dismiss();
  };

  const addTasks = () => {
    if (!title.trim()) return;
    const newTask = {
      id: Date.now().toString(),
      title,
      category: taskCategory,
      completed: false,
      pinned: false,
      deletedAt: null
    };
    setTasks([...tasks, newTask]);
    setTitle("");
    setAddTask(false);
  };

  const usedCategoryNames = tasks.filter(t => !t.deletedAt).map(t => t.category);
  const activeCategories = categories.filter(cat => usedCategoryNames.includes(cat.name));

  const completedCount = tasks.filter(t => t.completed && !t.deletedAt).length;
  const totalCount = tasks.filter(t => !t.deletedAt).length;
  const progress = totalCount === 0 ? 0 : completedCount / totalCount;

  const filteredTasks = tasks.filter((t) => {
    if (activeTab === "Bin") return t.deletedAt;
    if (t.deletedAt) return false;
    if (activeTab === "Active") return !t.completed;
    if (activeTab === "Completed") return t.completed;
    if (categories.some(c => c.name === activeTab)) return t.category === activeTab;
    return true;
  }).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}><Ionicons name="trophy" size={18} color="#D4AF37" /></View>
          <Text style={styles.logoText}>GoldDone</Text>
        </View>
        <TouchableOpacity style={styles.addTaskBtn} onPress={() => setAddTask(!addTask)}>
          <Ionicons name={addTask ? "close" : "add"} size={22} color="white" />
        </TouchableOpacity>
      </View>

      {/* Progress Card */}
      <View style={styles.statsCard}>
        <View style={styles.statsHeader}>
          <Text style={styles.statsTitle}>{activeTab === "Bin" ? "Recycle Bin" : "Elite Progress"}</Text>
          <Text style={styles.goldPercent}>{Math.round(progress * 100)}%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.statsSub}>{completedCount} of {totalCount} goals achieved</Text>
      </View>

      <View style={styles.content}>
        {/* Category Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
          {["All", "Active", "Completed", ...activeCategories.map(c => c.name), "Bin"].map((cat) => (
            <TouchableOpacity key={cat} onPress={() => setActiveTab(cat)} style={[styles.tab, activeTab === cat && styles.activeTab]}>
              <Text style={[styles.tabText, activeTab === cat && styles.activeTabText]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {addTask && (
          <View style={styles.formCard}>
            <TextInput placeholder="Set a new goal..." placeholderTextColor="#A68A39" style={styles.input} value={title} onChangeText={setTitle} />

            <Text style={styles.label}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.miniCatScroll}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.name}
                  onPress={() => setTaskCategory(cat.name)}
                  style={[styles.miniBtn, taskCategory === cat.name && styles.activeMini]}
                >
                  <Text style={[styles.miniBtnText, taskCategory === cat.name && styles.activeMiniText]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.addCatRow}>
              <TextInput
                placeholder="New folder..."
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                style={styles.catInput}
              />
              <TouchableOpacity onPress={addNewCategory} style={styles.plusBtn}>
                <Ionicons name="add" size={20} color="white" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={addTasks}>
              <Text style={styles.saveBtnText}>Save Task</Text>
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.taskCard}>
              <TouchableOpacity
                style={[styles.circle, item.completed && styles.checked]}
                onPress={() => setTasks(tasks.map(t => t.id === item.id ? { ...t, completed: !t.completed } : t))}
              >
                {item.completed && <Ionicons name="checkmark" size={14} color="white" />}
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <Text style={[styles.title, item.completed && styles.strike]}>{item.title}</Text>
                {/* FIX: Added ?. and fallback to "General" */}
                <Text style={styles.tagText}>
                  {(item.category || "General").toUpperCase()}
                </Text>
              </View>

              <View style={styles.actionRow}>
                {item.deletedAt ? (
                  <>
                    <TouchableOpacity onPress={() => setTasks(tasks.map(t => t.id === item.id ? { ...t, deletedAt: null } : t))}>
                      <Ionicons name="refresh-outline" size={22} color="#D4AF37" />
                    </TouchableOpacity>
                    <TouchableOpacity style={{ marginLeft: 15 }} onPress={() => setTasks(tasks.filter(t => t.id !== item.id))}>
                      <Ionicons name="trash-bin-outline" size={22} color="#780000" />
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity onPress={() => setTasks(tasks.map(t => t.id === item.id ? { ...t, pinned: !t.pinned } : t))}>
                      <Ionicons name={item.pinned ? "star" : "star-outline"} size={20} color={item.pinned ? "#D4AF37" : "#DDD"} />
                    </TouchableOpacity>
                    <TouchableOpacity style={{ marginLeft: 15 }} onPress={() => setTasks(tasks.map(t => t.id === item.id ? { ...t, deletedAt: Date.now() } : t))}>
                      <Ionicons name="trash-outline" size={20} color="#DDD" />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFDF5", paddingTop: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", padding: 20, alignItems: 'center' },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoIcon: { backgroundColor: '#780000', width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  logoText: { fontSize: 20, fontWeight: '800', color: '#780000' },
  addTaskBtn: { backgroundColor: '#780000', width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  // Stats Card
  statsCard: { marginHorizontal: 20, backgroundColor: '#FFF', padding: 20, borderRadius: 24, elevation: 4, shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, marginBottom: 20 },
  statsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statsTitle: { fontWeight: 'bold', color: '#780000' },
  goldPercent: { fontWeight: '900', color: '#D4AF37', fontSize: 18 },
  progressBarBg: { height: 8, backgroundColor: '#F5F5F5', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#D4AF37' },
  statsSub: { fontSize: 11, color: '#A68A39', marginTop: 10, fontWeight: '600' },

  content: { flex: 1, paddingHorizontal: 20 },
  tabBar: { maxHeight: 40, marginBottom: 15 },
  tab: { paddingHorizontal: 16, height: 32, justifyContent: 'center', backgroundColor: '#FDF2F2', borderRadius: 10, marginRight: 8, borderWidth: 1, borderColor: '#FADAD1' },
  activeTab: { backgroundColor: '#780000', borderColor: '#780000' },
  tabText: { color: '#780000', fontWeight: '700', fontSize: 12 },
  activeTabText: { color: '#FFF' },

  formCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 15, elevation: 5, borderLeftWidth: 5, borderLeftColor: '#D4AF37' },
  input: { borderBottomWidth: 1, borderColor: '#F0F0F0', marginBottom: 20, padding: 8, fontSize: 16, color: '#780000' },
  label: { fontSize: 10, fontWeight: '900', color: '#780000', marginBottom: 10, letterSpacing: 1 },
  miniCatScroll: { marginBottom: 15 },
  miniBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#FFF', borderRadius: 8, marginRight: 8, borderWidth: 1, borderColor: '#EEE' },
  activeMini: { backgroundColor: '#D4AF37', borderColor: '#D4AF37' },
  miniBtnText: { fontSize: 11, color: '#A68A39', fontWeight: '700' },
  activeMiniText: { color: '#FFF' },
  addCatRow: { flexDirection: 'row', marginBottom: 15, alignItems: 'center' },
  catInput: { flex: 1, backgroundColor: '#FDFDFD', padding: 10, borderRadius: 8, fontSize: 13, borderWidth: 1, borderColor: '#F0F0F0' },
  plusBtn: { backgroundColor: '#D4AF37', width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  saveBtn: { backgroundColor: '#780000', padding: 14, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },

  taskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 18, borderRadius: 20, marginBottom: 12, elevation: 2 },
  circle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#FADAD1', marginRight: 15, justifyContent: 'center', alignItems: 'center' },
  checked: { backgroundColor: '#780000', borderColor: '#780000' },
  title: { fontSize: 15, fontWeight: '700', color: '#333' },
  strike: { textDecorationLine: 'line-through', color: '#CCC' },
  tagText: { fontSize: 9, fontWeight: '900', color: '#D4AF37', marginTop: 4 },
  actionRow: { flexDirection: 'row', alignItems: 'center' }
});