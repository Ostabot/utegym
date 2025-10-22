import { Pressable, Text } from "react-native";
export function PrimaryButton({ title, onPress }: {title:string; onPress:() => void}) {
  return (
    <Pressable onPress={onPress} className="bg-black px-4 py-3 rounded-lg items-center">
      <Text className="text-white font-semibold">{title}</Text>
    </Pressable>
  );
}
