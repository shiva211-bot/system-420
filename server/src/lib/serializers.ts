import type { ChatMessage, Title, User } from "@prisma/client";
import { walletSnapshot, type WalletColumn } from "./currency";
import { canSeePosition, nextPosition, positionLabel } from "./positions";
import { areaLabel, countryLabel, regionLabel, stateLabel } from "./geo";

export type UserWithTitle = User & { activeTitle: Title | null; partner?: { username: string; gender: string } | null };

function walletFromUser(user: User) {
  return walletSnapshot(user as User & Record<WalletColumn, number>);
}

export function publicUser(
  user: UserWithTitle,
  viewer?: { id?: string; role?: string; position?: string } | null,
) {
  const isSelf = Boolean(viewer?.id && viewer.id === user.id);
  const isAdmin = viewer?.role === "ADMIN" || user.role === "ADMIN" && isSelf;
  const viewerAdmin = viewer?.role === "ADMIN";
  const visible = canSeePosition(viewer?.position ?? "PLAYER", user.position, { admin: viewerAdmin, self: isSelf });
  return {
    id: user.id,
    username: user.username,
    email: isSelf || viewerAdmin ? user.email : undefined,
    role: user.role,
    position: visible ? user.position : "CLASSIFIED",
    positionLabel: visible ? positionLabel(user.position) : "Classified",
    nextPosition: isSelf || viewerAdmin ? nextPosition(user.position) : null,
    nextPositionLabel: isSelf || viewerAdmin ? (nextPosition(user.position) ? positionLabel(nextPosition(user.position)!) : null) : null,
    wallet: walletFromUser(user),
    bio: user.bio,
    equippedBadge: user.equippedBadge,
    activeTitle: user.activeTitle?.name ?? "",
    activeTitleId: user.activeTitleId,
    gender: user.gender,
    age: isSelf || viewerAdmin ? user.age : null,
    bloodType: isSelf || viewerAdmin ? user.bloodType : "",
    realName: isSelf || viewerAdmin ? user.realName : "",
    country: user.country,
    state: user.state,
    region: user.region,
    area: user.area,
    countryLabel: countryLabel(user.country),
    stateLabel: stateLabel(user.state),
    regionLabel: regionLabel(user.region),
    areaLabel: areaLabel(user.area),
    partnerUsername: isSelf || viewerAdmin ? user.partner?.username ?? null : null,
    partyId: user.partyId,
    status: user.status,
    introSeen: isSelf ? Boolean(user.introSeenAt) : undefined,
    createdAt: user.createdAt.toISOString(),
  };
}

export function chatPayload(message: ChatMessage, sender: UserWithTitle, viewer?: { id?: string; role?: string; position?: string } | null) {
  const visible = canSeePosition(viewer?.position ?? "PLAYER", sender.position, {
    admin: viewer?.role === "ADMIN",
    self: viewer?.id === sender.id,
  });
  return {
    messageId: message.id,
    senderId: sender.id,
    senderUsername: sender.username,
    senderTitle: sender.activeTitle?.name ?? "",
    senderPosition: visible ? sender.position : "CLASSIFIED",
    senderPositionLabel: visible ? positionLabel(sender.position) : "Classified",
    senderBadge: sender.equippedBadge,
    recipientId: message.recipientId,
    channelType: message.channelType,
    content: message.content,
    timestamp: message.createdAt.toISOString(),
  };
}

export function locationFields(user: User) {
  return {
    country: user.country,
    state: user.state,
    region: user.region,
    area: user.area,
    countryLabel: countryLabel(user.country),
    stateLabel: stateLabel(user.state),
    regionLabel: regionLabel(user.region),
    areaLabel: areaLabel(user.area),
  };
}
