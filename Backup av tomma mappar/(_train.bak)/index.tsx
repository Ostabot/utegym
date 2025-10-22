import { Link } from "expo-router";
import { View, Text, Button } from "react-native";
export default function TrainEntry(){
  return (
    <View className="flex-1 p-4">
      <Text className="text-xl font-bold">Träna — Steg 1 (Välj gym)</Text>
      <Link href="/train/plan" asChild><Button title="Vidare till plan" /></Link>
    </View>
  );
}
