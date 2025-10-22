import { Link } from "expo-router";
import { View, Text, Button } from "react-native";
export default function TrainPlan(){
  return (
    <View className="flex-1 p-4">
      <Text className="text-xl font-bold">Steg 2–5 Översikt</Text>
      <Link href="/train/run" asChild><Button title="Starta" /></Link>
    </View>
  );
}
