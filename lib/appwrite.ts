import {Account, Avatars, Client, OAuthProvider, Databases} from "react-native-appwrite";
import * as Linking from "expo-linking";
import {openAuthSessionAsync} from "expo-web-browser";
import {Query} from "appwrite";

export const config = {
    platform: 'com.ptit.restate',
    endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
    projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
    databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
    galleriesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_GALLERIES_COLLECTION_ID,
    reviewsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_REVIEWS_COLLECTION_ID,
    agentsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_AGENT_COLLECTION_ID,
    propertiesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID,
}

export const client = new Client();

client
    .setEndpoint(config.endpoint!)
    .setProject(config.projectId!)
    .setPlatform(config.platform!)

export const avatar = new Avatars(client);
export const account = new Account(client);
export const databases = new Databases(client);

export async function login() {
    try {
        const redirectUri = Linking.createURL('/');

        const response = await account.createOAuth2Token({
            provider: OAuthProvider.Google,
            success: redirectUri
        });

        if (!response) throw new Error("Failed to login");

        const browserResult = await openAuthSessionAsync(
            response.toString(),
            redirectUri
        );

        if (browserResult.type !== 'success') throw new Error("Failed to login");

        const url = new URL(browserResult.url);

        const secret = url.searchParams.get("secret")?.toString();
        const userId = url.searchParams.get("userId")?.toString();

        if (!secret || !userId) throw new Error("Failed to login");

        const session = await account.createSession({
            userId: userId,
            secret: secret,
        });

        if(!session) throw new Error("Failed to create a session");

        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
}

export async function logout() {
    try {
        await account.deleteSession({
            sessionId: 'current',
        });
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
}

export async function getCurrentUser() {
    try {
        const response = await account.get();

        if (response.$id) {
            console.log(`Current user: ${response.name}`);
            const userAvatar = avatar.getInitials();

            return {
                ...response,
                avatar: userAvatar.toString(),
            };
        }
    } catch (e) {
        console.error(e);
        return false;
    }
}

export async function getLastestProperties() {
    try {
        const result = await databases.listDocuments(
            config.databaseId!,
            config.propertiesCollectionId!,
            [Query.orderAsc("$createdAt"), Query.limit(5)]
        );

        return result.documents;
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function getProperties({filter, query, limit}:{
    filter: string,
    query: string,
    limit: number,
}) {
    try {
        const buildQuery = [Query.orderDesc('$createdAt')];

        if (filter && filter != 'All') {
            buildQuery.push(Query.equal('type',filter));
        }

        if (query) {
            buildQuery.push(
                Query.or([
                    Query.search('name',query),
                    Query.search('address',query),
                    Query.search('type',query),
                ])
            );
        }

        if (limit) buildQuery.push(Query.limit(limit));

        const result = await databases.listDocuments(
            config.databaseId!,
            config.propertiesCollectionId!,
            buildQuery,
        );

        return result.documents;
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function getPropertyById({ id }: { id: string }) {
    try {
        const result = await databases.getDocument(
            config.databaseId!,
            config.propertiesCollectionId!,
            id
        );
        return result;
    } catch (error) {
        console.error(error);
        return null;
    }
}