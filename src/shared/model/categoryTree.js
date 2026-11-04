/** 从同一分类表的父子标识还原树，丢弃孤立和循环节点，不改动长ID。 */
export function categoryTree(rows = []) {
 const nodes = new Map(rows.map(row => [String(row.categoryId), { id: row.categoryId, name: row.name, children: [], parentId: String(row.parentId ?? '0') }]))
 const roots = []
 for (const node of nodes.values()) {
  if (node.parentId === '0') { roots.push(node); continue }
  const visited = new Set([String(node.id)]); let parent = nodes.get(node.parentId), cursor = parent, valid = true
  while (cursor) { if (visited.has(String(cursor.id))) { valid = false; break }; visited.add(String(cursor.id)); cursor = nodes.get(cursor.parentId) }
  if (valid && parent) parent.children.push(node)
 }
 return roots
}
