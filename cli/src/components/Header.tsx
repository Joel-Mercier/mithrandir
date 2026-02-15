import { Box, Text } from "ink";

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
  const divider = "⚜ ═══════════════════════════════ ⚜";

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box flexDirection="column" alignItems="center">
        <Box flexDirection="column">
          {gandalfArt.map((line, i) => (
            <Text key={i} color="yellow" dimColor>{line}</Text>
          ))}
        </Box>
        <Box flexDirection="column" alignItems="center" marginTop={1}>
          <Text color="yellow">{divider}</Text>
          <Text bold color="yellow">
            {"╔╦╗╦╔╦╗╦ ╦╦═╗╔═╗╔╗╔╔╦╗╦╦═╗"}
          </Text>
          <Text bold color="yellow">
            {"║║║║ ║ ╠═╣╠╦╝╠═╣║║║ ║║║╠╦╝"}
          </Text>
          <Text bold color="yellow">
            {"╩ ╩╩ ╩ ╩ ╩╩╚═╩ ╩╝╚╝═╩╝╩╩╚═"}
          </Text>
          <Text color="yellow">{divider}</Text>
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
