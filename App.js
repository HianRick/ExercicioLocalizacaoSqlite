import { useState, useEffect } from "react";
import * as Location from "expo-location";
import { FlatList, StyleSheet, View } from "react-native";
import {
  Appbar,
  Button,
  List,
  PaperProvider,
  Switch,
  Text,
  MD3LightTheme as DefaultTheme,
} from "react-native-paper";
import myColors from "./assets/colors.json";
import myColorsDark from "./assets/colorsDark.json";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { openDatabaseAsync } from "expo-sqlite";

export default function App() {
  const STORAGE_KEY = "@Modo";
  const [db, setDb] = useState(null);

  const [isSwitchOn, setIsSwitchOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [locations, setLocations] = useState([]);
  const [theme, setTheme] = useState({
    ...DefaultTheme,
    colors: myColors.colors,
  });

  // Inicializa o banco e cria tabela
  useEffect(() => {
    (async () => {
      const database = await openDatabaseAsync("locations.db");
      setDb(database);

      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS locations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          latitude REAL,
          longitude REAL,
          date TEXT
        );
      `);

      await loadLocations(database);
    })();
  }, []);

  // Dark mode
  const saveMode = async (value) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, value ? "true" : "false");
    } catch (e) {
      console.log("Erro ao salvar modo:", e);
    }
  };

  const loadDarkMode = async () => {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEY);
      if (value !== null) setIsSwitchOn(value === "true");
    } catch (e) {
      console.log("Erro ao carregar modo:", e);
    }
  };

  const onToggleSwitch = async () => {
    const newValue = !isSwitchOn;
    setIsSwitchOn(newValue);
    await saveMode(newValue);
  };

  useEffect(() => {
    setTheme({
      ...DefaultTheme,
      colors: isSwitchOn ? myColorsDark.colors : myColors.colors,
    });
  }, [isSwitchOn]);

  useEffect(() => {
    loadDarkMode();
  }, []);

  async function loadLocations(database = db) {
    if (!database) return;
    const rows = await database.getAllAsync("SELECT * FROM locations ORDER BY id DESC;");
    setLocations(rows);
  }

  async function saveLocationToDB(latitude, longitude) {
    if (!db) return;
    const date = new Date().toLocaleString();
    await db.runAsync(
      "INSERT INTO locations (latitude, longitude, date) VALUES (?, ?, ?);",
      [latitude, longitude, date]
    );
    await loadLocations();
  }

  async function getLocation() {
    try {
      setIsLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        alert("Permissão negada.");
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = currentLocation.coords;
      await saveLocationToDB(latitude, longitude);
    } catch (error) {
      console.log("Erro ao capturar localização:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function clearLocations() {
    if (!db) return;
    await db.execAsync("DELETE FROM locations;");
    setLocations([]);
  }

  return (
    <PaperProvider theme={theme}>
      <Appbar.Header>
        <Appbar.Content title="My Location BASE" />
      </Appbar.Header>

      <View style={{ backgroundColor: theme.colors.background, flex: 1 }}>
        <View style={styles.containerDarkMode}>
          <Text style={{ color: theme.colors.onBackground }}>Dark Mode</Text>
          <Switch value={isSwitchOn} onValueChange={onToggleSwitch} />
        </View>

        <Button
          style={styles.containerButton}
          icon="map"
          mode="contained"
          loading={isLoading}
          onPress={getLocation}
        >
          Capturar localização
        </Button>

        <Button
          style={styles.containerButton}
          icon="delete"
          mode="outlined"
          onPress={clearLocations}
        >
          Limpar localizações
        </Button>

        <FlatList
          style={styles.containerList}
          data={locations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <List.Item
              title={`Lat: ${item.latitude.toFixed(5)}, Lon: ${item.longitude.toFixed(5)}`}
              description={item.date}
              left={(props) => <List.Icon {...props} icon="map-marker" />}
            />
          )}
        />
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  containerDarkMode: {
    margin: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  containerButton: {
    margin: 10,
  },
  containerList: {
    margin: 10,
  },
});
