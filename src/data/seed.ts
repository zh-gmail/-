import { MOCK_LIBRARY } from './mockLibrary';
import { saveItem } from '../services/libraryApi';

export async function seedLibrary(): Promise<void> {
  await Promise.all(MOCK_LIBRARY.map((item) => saveItem(item)));
}
