import { Box, Text } from "ink";
import { Divider } from "@/components/Divider.js";
import { getVersionString } from "@/commands/version.js";

interface HeaderProps {
  title?: string;
}

const gandalfArt = [
  "⠐⠔⠔⠌⠢⢨⢐⣔⢐⣼⣂⢮⢳⡹⡕⣏⣵⣻⣽⢿⣻⣻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣻⣿⢿⣿⣳⣯⣯⣷⣿⣽⣞⣾⣲",
  "⠨⠘⢔⠠⡑⣍⣷⣿⡎⣼⣽⡪⡫⣺⢪⠳⣩⣵⣾⡾⣟⣿⣽⣽⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣾⣽⣿⣿⣿⣳⣽⣷⣿⣾⣞⣾",
  "⠨⡨⢐⠈⡈⠢⡏⣎⢓⢿⠑⣕⢽⣬⣶⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣿⣾⣽⣾⣻⣿⣽⣿",
  "⠨⠐⠐⠄⠄⠄⠈⠊⣀⣤⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⢿⠿⢟⠟⠟⠟⠛⠙⠙⠉⠙⠉⠙⠙⠋⠋⠋⠋⠛⠛⠿⢾",
  "⠈⠂⠁⢁⣡⣴⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⡿⡻⠹⠙⠍⠉⠊⡀⠁⡀⢁⢀⡀⡀⠀⠀⠀⠀⠠⡀⠀⠀⠠⠀⠌⠄⠅⠄⡁⡂⠄⠄",
  "⣠⣶⣿⣿⣿⣿⣿⢿⠿⠛⠏⠛⠙⠉⠌⡀⠂⠀⠀⠀⠑⠑⠳⢝⡷⡸⣼⢸⡽⠕⠃⠉⠁⢀⠈⢄⠁⠄⡃⡀⠀⠠⠀⡈⠌⢐⢐⢐⠨⢀",
  "⠿⠟⠛⠋⠋⠉⠂⠀⠀⢄⡡⠊⠀⡀⡐⠌⡂⠢⣲⣜⡶⣳⢦⢕⠹⡼⡺⣌⠫⡺⠽⠫⠷⣗⡆⠰⡐⠠⠐⠐⠀⠀⠠⠀⡐⠠⠐⡀⡂⢂",
  "⠀⢀⠀⡀⠀⠀⠀⠀⣡⠳⠀⡀⢐⠐⡌⡂⠂⠏⡄⣄⣄⣄⡄⠄⠐⡀⡈⡔⢔⢠⢠⢶⢦⢢⢹⢐⢐⠈⠈⠔⡈⠀⠀⠂⠀⠂⠐⡀⡐⠠",
  "⠀⠄⠀⠀⠀⠀⠀⠜⡜⢌⠠⠀⠀⠐⡨⠠⢩⠪⡘⡜⢜⠑⠌⡊⠌⡐⢑⠕⡱⣱⢱⢩⢫⡹⣜⢆⢇⠈⠈⠢⡨⠀⠀⠠⠈⢀⠡⠀⡐⡀",
  "⠀⠀⠀⠀⠀⠀⢎⠌⠜⠀⠀⠀⢀⠀⢊⠌⡆⡏⢎⢜⢔⣕⠕⠁⠡⡠⡱⣱⡘⠌⠳⣧⣧⣻⢸⢜⢜⢔⢔⠀⡘⠄⠂⠀⠀⠠⢀⠂⠄⠄",
  "⠀⠀⠀⠀⠀⡜⠔⠠⠡⠈⠀⠌⠀⡀⠀⠕⡕⡕⡕⡵⣗⢇⢔⠳⢕⢕⣗⣽⢪⣪⣷⢹⢽⣞⢜⢜⢜⠜⢜⠆⠨⡑⢀⠀⠌⠨⠀⡐⠐⠀",
  "⠀⠀⠀⠀⡰⢁⢐⠁⠐⠀⠠⡡⠂⠠⠈⡐⠱⡱⡑⣽⡱⡱⣪⢪⢪⢸⢸⣜⢞⢎⢞⡮⣫⣞⢜⢧⠹⡌⢮⢅⢑⢱⠀⠀⠂⠂⠁⠀⠈⣀",
  "⠀⠀⠀⡐⠅⠂⡀⠀⠂⢀⠪⡐⠬⠈⡂⠠⢈⢂⢳⡳⡼⣝⢷⣫⣿⡵⣳⢵⣳⡽⣟⣟⣷⡳⡹⡜⣘⡘⡎⡧⣲⡁⠂⠀⣀⣠⠔⠒⡉⢕",
  "⢨⢲⢴⢰⢁⠄⢀⠀⠨⠀⠅⢨⠂⡐⡨⠐⠄⠢⣣⡟⡽⣗⢆⢀⠀⠉⠌⠁⢁⢠⣫⣻⣽⣞⢬⠊⠢⢱⣸⢸⢎⢮⡲⣷⠩⠢⡳⠲⠸⡑",
  "⣊⣪⢫⢊⠰⠐⢄⠌⢌⠄⢐⠕⡐⡑⡜⠌⢌⢪⢗⢽⡹⡑⣝⢜⢮⣗⢵⢞⡿⡽⡞⡞⣞⣞⢗⢕⢅⢗⡽⡪⡳⣕⣽⣻⢷⠀⠄⠣⠱⡐",
  "⠃⢅⠣⡒⠀⠱⠠⠑⢔⢔⢎⢑⠨⣪⢨⡣⡕⡕⡝⡯⢷⡇⡇⡇⡣⠢⡓⢗⢽⠱⢍⢗⠰⣳⣳⢵⢕⡗⡽⣸⢜⢲⣽⣿⣮⢓⠄⠈⡀⠢",
  "⠑⡕⠡⠂⠀⠌⠂⠀⠣⣏⢂⠅⡪⡪⡲⢱⢑⢜⡎⢆⡷⣏⡎⡮⡄⣄⢤⢣⡣⣝⢦⡣⣑⡯⣗⣯⣣⣻⢺⡳⡽⣔⣽⣿⣿⣗⡨⢄⠂⠄",
  "⢀⠱⢑⠁⠀⡈⠠⠁⡈⠦⡃⡕⡵⡑⡕⡱⡱⡑⡎⣇⢟⡵⣑⢧⢣⡣⣻⡪⣎⢗⣗⢽⡣⡯⣳⢳⣳⢝⡵⡯⣾⣻⣷⣿⣿⣿⣷⣒⢊⠄",
  "⠀⠑⠠⢑⠀⠅⠂⡐⢀⠐⡈⢌⡞⡼⡸⡸⡨⢰⢱⢺⠸⣎⡎⣗⢕⡕⣕⣟⡮⣪⢳⢽⢮⢷⣕⠯⣞⢗⣯⣯⣿⣿⣿⣻⢽⢿⣿⣿⠔⠀",
  "⡐⠌⠄⡕⠲⢌⡢⡠⠂⡄⠐⡕⡱⡎⡇⢗⢌⡂⡿⡸⣜⣵⢱⡣⣷⣹⡂⡗⣻⡪⣏⣗⡽⣳⢽⢯⣺⣽⣽⣿⣿⣿⣿⣿⣻⣿⣻⣿⣿⡄",
];

function makeBanner(text: string): string[] {
  const inner = ` ⚔  ${text}  ⚔ `;
  const width = inner.length;
  return [
    `╔${"═".repeat(width)}╗`,
    `║${inner}║`,
    `╚${"═".repeat(width)}╝`,
  ];
}

export function Header({ title }: HeaderProps) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box flexDirection="column" alignItems="center">
        <Box flexDirection="column">
          {gandalfArt.map((line, i) => (
            <Text key={i} color="yellow" dimColor>{line}</Text>
          ))}
        </Box>
        <Box flexDirection="column" alignItems="center" marginTop={1}>
          <Divider dividerChar="═" dividerColor="yellow" width={40} />
          <Text bold color="yellow">
            {"╔╦╗╦╔╦╗╦ ╦╦═╗╔═╗╔╗╔╔╦╗╦╦═╗"}
          </Text>
          <Text bold color="yellow">
            {"║║║║ ║ ╠═╣╠╦╝╠═╣║║║ ║║║╠╦╝"}
          </Text>
          <Text bold color="yellow">
            {"╩ ╩╩ ╩ ╩ ╩╩╚═╩ ╩╝╚╝═╩╝╩╩╚═"}
          </Text>
          <Divider dividerChar="═" dividerColor="yellow" width={40} />
          <Text dimColor>{getVersionString()}</Text>
        </Box>
      </Box>
      {title && (
        <Box flexDirection="column" alignItems="center" marginTop={1}>
          {makeBanner(title).map((line, i) => (
            <Text key={i} bold color="white">{line}</Text>
          ))}
        </Box>
      )}
    </Box>
  );
}
