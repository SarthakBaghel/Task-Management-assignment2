function taxonomyResponse(item) {
  if (!item) {
    return null;
  }

  const raw = typeof item.toObject === 'function' ? item.toObject() : item;
  const id = raw._id || raw.id || raw;

  return {
    id: String(id),
    ...(raw.name ? { name: raw.name } : {}),
  };
}

function taskResponse(task) {
  const raw = typeof task.toObject === 'function' ? task.toObject() : task;

  return {
    id: String(raw._id),
    ownerId: raw.ownerId,
    title: raw.title,
    description: raw.description || '',
    dueDate: raw.dueDate,
    status: raw.status,
    completedAt: raw.completedAt || null,
    category: taxonomyResponse(raw.categoryId),
    tags: (raw.tagIds || []).map(taxonomyResponse),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

module.exports = {
  taxonomyResponse,
  taskResponse,
};
