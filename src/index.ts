import joplin from 'api';
import JoplinData from 'api/JoplinData';
import { ContentScriptType, Path, SettingItem, SettingItemType } from 'api/types';

async function getAll(api: JoplinData, path: Path, query: any): Promise<any[]> {
	query.page = 1;
	let response = await api.get(path, query);
	let result = !!response.items ?  response.items : [];
	while (!!response.has_more) {
		query.page += 1;
		response = await api.get(path, query);
		result = result.concat(response.items);
	}
	return result;
}

joplin.plugins.register({
	onStart: async function() {
		await joplin.settings.registerSection('Inline Tags', {
			description: 'Inline Tags Plugin Settings',
			label: 'Inline Tags',
			iconName: 'fas fa-hashtag'
		});
		await joplin.settings.registerSettings({
			'keepText': {
				public: true,
				section: 'Inline Tags',
				type: SettingItemType.Bool,
				value: true,
				label: 'Keep #tag text in editor',
			}
		});

		await joplin.contentScripts.register(
			ContentScriptType.CodeMirrorPlugin,
			'inlineTags',
			'./contentScript/index.js'
		);

		await joplin.contentScripts.onMessage('inlineTags', async (message: any) => {
			const selectedNoteIds = await joplin.workspace.selectedNoteIds();
			const noteId = selectedNoteIds[0];

			if (message.command === 'getTags') {
				let allTags = await getAll(joplin.data, ['tags'], { fields: ['id', 'title'], page: 1 });
				const noteTags: string[] =
					(await getAll(joplin.data, ['notes', noteId, 'tags'], { fields: ['id'], page: 1 })).map(t => t.id);
				allTags = allTags.filter(t => !noteTags.includes(t.id));

				const keepText: boolean = await joplin.settings.value('keepText');
				return {
					tags: allTags,
					keepText: keepText
				}
			} else if (message.command === 'setTag') {
				await joplin.data.post(['tags', message.tag.id, 'notes'], null, {
					id: noteId
				});
			} else if (message.command === 'newTag') {
				const newTag = await joplin.data.post(['tags'], null, {
					title: message.name
				});
				await joplin.data.post(['tags', newTag.id, 'notes'], null, {
					id: noteId
				});
			}
		});
	},
});
