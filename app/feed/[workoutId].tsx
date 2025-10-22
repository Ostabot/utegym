import { useLocalSearchParams } from "expo-router";
import { View, Text } from "react-native";
export default function WorkoutDetail(){
  const { workoutId } = useLocalSearchParams<{workoutId:string}>();
  return (
    <View className="flex-1 p-4">
      <Text className="text-xl font-bold">Workout {workoutId}</Text>
    </View>
  );
}
