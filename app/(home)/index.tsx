import { Link } from "expo-router";
import { View, Text } from "react-native";
export default function Home(){
  return (
    <View className="flex-1 p-4">
      <Text className="text-xl font-bold mb-2">Utegym nära dig</Text>
      <Link href="/gym/1" className="text-blue-600">Exempel: Gå till gym-detalj</Link>
    </View>
  );
}
