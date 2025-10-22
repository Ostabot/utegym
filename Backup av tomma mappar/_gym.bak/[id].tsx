import { useLocalSearchParams } from "expo-router";
import { View, Text, Button } from "react-native";
export default function GymDetail(){
  const { id } = useLocalSearchParams<{id:string}>();
  return (
    <View className="flex-1 p-4">
      <Text className="text-xl font-bold">Gym #{id}</Text>
      <Button title="Starta pass här" onPress={()=>{}} />
      <Button title="Lägg till foto" onPress={()=>{}} />
    </View>
  );
}
