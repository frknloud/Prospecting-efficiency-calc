export function getItemId(item: {
  id?: string;
  name: string;
}) {
  return item.id ?? item.name;
}
