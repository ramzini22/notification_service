import { Injectable } from '@nestjs/common';
import { ClientSocket } from '../types/client-socket.type';
import { DataResponse } from '../../queue/dto/data-response.dto';
import { chatOnline } from '../types/chat-online.type';
import { EventsEnum } from '../types/event.enum';

import { QueueService } from '../../queue/queue.service';
import { TopicsEnum } from '../../queue/type/topics.enum';

@Injectable()
export class WsServer {
    public readonly rooms: Map<string, Set<ClientSocket>>;
    private readonly selectedClients: Set<ClientSocket>;
    private queueService: QueueService;
    private readonly maxUsersOnline: Map<string, number>;

    constructor(
        rooms: Map<string, Set<ClientSocket>> = new Map<string, Set<ClientSocket>>(),
        selectedClients: Set<ClientSocket> = new Set<ClientSocket>(),
    ) {
        this.rooms = rooms;
        this.selectedClients = selectedClients;
        this.maxUsersOnline = new Map<string, number>();
    }

    public setQueueService(queueService: QueueService) {
        this.queueService = queueService;
    }

    public leave(clientId: string, ...roomNames: string[]): boolean {
        const [client]: ClientSocket[] = Array.from(this.rooms.get(clientId) ?? []);

        const rooms: chatOnline[] = [];
        if (!client) return false;

        roomNames.forEach((name) => {
            client.client.rooms.delete(name);

            const correctRoom = this.rooms.get(name);
            if (!correctRoom) return;

            correctRoom.delete(client);
            if (!correctRoom.size) return this.rooms.delete(name);

            const onlineUsers = this.rooms.get(name).size;
            const roundNumbers = this.getNumbersString(onlineUsers);

            rooms.push({ name: name, onlineUsers: roundNumbers });
        });

        rooms.forEach(({ name, onlineUsers }) => {
            const countUsersBefore = this.getNumbersString(this.rooms.get(name).size + 1);
            if (onlineUsers !== countUsersBefore) this.online({ name, onlineUsers });
        });

        return true;
    }

    public join(clientId: string, ...roomNames: string[]): boolean {
        const [client]: ClientSocket[] = Array.from(this.rooms.get(clientId) ?? []);
        if (!client) return false;

        const rooms: chatOnline[] = [];

        roomNames.forEach((name) => {
            client.client.rooms.add(name);
            const correctRoom = this.rooms.get(name);

            if (!correctRoom) {
                const newRoom = new Set<ClientSocket>();
                newRoom.add(client);
                this.rooms.set(name, newRoom);
                this.maxUsersOnline.set(name, 0);
            } else {
                correctRoom.add(client);
            }
            const onlineUsers = this.rooms.get(name).size;
            const roundNumbers = this.getNumbersString(onlineUsers);
            rooms.push({ name, onlineUsers: roundNumbers });

            const updateMaxUsersOnline = this.maxUsersOnline.get(name) || 0;
            if (onlineUsers > updateMaxUsersOnline) {
                this.maxUsersOnline.set(name, onlineUsers);
                this.sendMaxUsersToKafka(name, onlineUsers);
            }
        });

        this.to(clientId).emit(EventsEnum.CHAT_COUNT_ONLINE, new DataResponse<chatOnline[]>(rooms));

        rooms.forEach(({ name, onlineUsers }) => {
            const countUsersBefore = this.getNumbersString(this.rooms.get(name).size - 1);
            if (onlineUsers !== countUsersBefore) this.online({ name, onlineUsers }, clientId);
        });

        return true;
    }

    private sendMaxUsersToKafka(roomName: string, onlineUsers: number) {
        const massage = { roomName, onlineUsers };
        const response = new DataResponse(massage);
        this.queueService.sendMessage(TopicsEnum.ONLINE, response);
    }

    private getNumbersString(number: number): string {
        if (number < 1000) {
            return number.toString();
        } else if (number < 1000000) {
            return (number / 1000).toString() + 'К';
        } else {
            return (number / 1000000).toString() + 'M';
        }
    }

    public online(room: chatOnline, clientId?: string): void {
        this.to(room.name)
            .except(clientId)
            .emit(EventsEnum.CHAT_COUNT_ONLINE, new DataResponse<chatOnline[]>([room]));
    }

    public to(roomName: string): WsServer {
        const room = new Set(this.rooms.get(roomName));
        const selectedClients = new Set<ClientSocket>(this.selectedClients);

        if (room) room.forEach((client) => selectedClients.add(client));
        const rooms = new Map<string, Set<ClientSocket>>(this.rooms);

        return new WsServer(rooms, selectedClients);
    }

    public except(roomName: string): WsServer {
        const rooms = new Map(this.rooms);
        const selectedClients = new Set<ClientSocket>(this.selectedClients);
        const exceptedRoom = this.rooms.get(roomName);

        if (exceptedRoom) exceptedRoom.forEach((client) => selectedClients.delete(client));

        return new WsServer(rooms, selectedClients);
    }

    public intersect(...intersectRooms: string[]): WsServer {
        const selectedClients = new Set<ClientSocket>(this.selectedClients);
        const rooms = new Map(this.rooms);

        const clientRoomsCount = new Map<ClientSocket, number>();

        intersectRooms.forEach((roomName) => {
            const clients = rooms.get(roomName);

            if (clients) {
                clients.forEach((client) => {
                    const correctClientRoomsCount = clientRoomsCount.get(client);

                    if (correctClientRoomsCount) clientRoomsCount.set(client, correctClientRoomsCount + 1);
                    else clientRoomsCount.set(client, 1);
                });
            }
        });

        clientRoomsCount.forEach((count, client) => {
            if (count === intersectRooms.length) selectedClients.add(client);
        });

        return new WsServer(rooms, selectedClients);
    }

    public emitAll(event: string, data: object | string) {
        const clientsRoom = new Set<ClientSocket>();
        this.rooms.forEach((room) => room.forEach((client) => clientsRoom.add(client)));

        clientsRoom.forEach((client) => client.send(JSON.stringify({ event, data })));
    }

    public emit(event: string, data: object | string): void {
        if (!this.selectedClients.size) return;

        this.selectedClients.forEach((client) => client.send(JSON.stringify({ event, data })));
    }

    public addConnection(client: ClientSocket): boolean {
        if (!client.id) return false;

        const userRoom = new Set<ClientSocket>();
        userRoom.add(client);
        this.rooms.set(client.id, userRoom);

        return true;
    }

    public deleteConnection(client: ClientSocket): boolean {
        if (!client.id) return false;

        client.client.leaveAll();
        return this.rooms.delete(client.id);
    }

    public getConnection(clientId: string): ClientSocket {
        const [client] = Array.from(this.rooms.get(clientId) ?? []);

        return client;
    }
}

export default new WsServer();
