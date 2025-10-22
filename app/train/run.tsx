import { useState } from "react";
import { View, Text, Button } from "react-native";
export default function RunWorkout(){
  const [setsDone, setSetsDone] = useState(0);
  return (
    <View className="flex-1 p-4">
      <Text className="text-xl font-bold">Kör pass</Text>
      <Button title="Set klart" onPress={()=>setSetsDone(s=>s+1)} />
      <Text className="mt-2">Gjorda set: {setsDone}</Text>
      <Button title="Avsluta pass" onPress={()=>{}} />
    </View>
  );
}
