import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { api, type Party, type User } from './api';
import { useSession } from './session';
import { Avatar, AvatarStack } from './Avatar';
import { AVATAR_COLORS, AVATAR_GLYPHS, Glyph } from './glyphs';
import { Button, Card, Chip, Field, colors, u } from './ui';

/** Профиль с аккаунтом: аватар, код друга, друзья, заявки и пачки. */
export function FriendsPanel() {
  const { me, setMe, signOut } = useSession();
  const [friends, setFriends] = useState<{ friends: User[]; incoming: User[]; outgoing: User[] }>({ friends: [], incoming: [], outgoing: [] });
  const [parties, setParties] = useState<Party[]>([]);
  const [code, setCode] = useState('');
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(false);
  const [newParty, setNewParty] = useState<{ name: string; ids: string[] } | null>(null);
  const refresh = useCallback(async () => {
    try { const [f, p] = await Promise.all([api.friends(), api.parties()]); setFriends(f); setParties(p.parties); }
    catch (problem) { setNote((problem as Error).message); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  if (!me) return null;
  const act = async (action: () => Promise<unknown>, done?: string) => {
    setNote('');
    try { await action(); if (done) setNote(done); await refresh(); } catch (problem) { setNote((problem as Error).message); }
  };
  return <View style={{ gap: 18 }}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Изменить аватар" onPress={() => setEditing(!editing)} style={({ pressed }) => pressed && u.pressed}>
        <Avatar avatar={me.avatar} size={72} ring />
        <View style={s.editBadge}><Glyph name={editing ? 'check' : 'plus'} size={14} color={colors.bg} stroke={2.4} /></View>
      </Pressable>
      <View style={{ flex: 1, gap: 2 }}><Text style={u.title} numberOfLines={1}>{me.name}</Text><Text style={u.muted}>@{me.handle}</Text></View>
    </View>

    {editing && <Card>
      <Text style={u.label}>Образ</Text>
      <View style={s.grid}>{AVATAR_GLYPHS.map(glyph => <Pressable key={glyph} accessibilityRole="button" accessibilityLabel={glyph} onPress={() => void act(async () => setMe(await api.updateMe({ avatar: { glyph, color: me.avatar.color } })))} style={({ pressed }) => [s.cell, me.avatar.glyph === glyph && { borderColor: me.avatar.color, backgroundColor: me.avatar.color + '22' }, pressed && u.pressed]}>
        <Glyph name={glyph} size={26} color={me.avatar.glyph === glyph ? me.avatar.color : colors.muted} />
      </Pressable>)}</View>
      <Text style={u.label}>Цвет</Text>
      <View style={u.row}>{AVATAR_COLORS.map(color => <Pressable key={color} accessibilityRole="button" accessibilityLabel={`Цвет ${color}`} onPress={() => void act(async () => setMe(await api.updateMe({ avatar: { glyph: me.avatar.glyph, color } })))} style={({ pressed }) => [s.swatch, { backgroundColor: color }, me.avatar.color === color && s.swatchOn, pressed && u.pressed]} />)}</View>
    </Card>}

    <Card>
      <Text style={u.label}>Мой код друга</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={s.code} selectable>{me.friendCode}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Поделиться кодом" onPress={() => void Share.share({ message: `Добавь меня в «Тумане Владивостока»: код ${me.friendCode} или @${me.handle}` })} style={({ pressed }) => [s.iconButton, pressed && u.pressed]}><Glyph name="share" size={20} /></Pressable>
      </View>
      <Text style={u.muted}>Продиктуйте или отправьте — по коду вас добавят в друзья.</Text>
    </Card>

    <View style={{ gap: 10 }}>
      <Text style={u.heading}>Добавить друга</Text>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}><Field label="Код или @ник" value={code} onChangeText={setCode} /></View>
        <Button primary label="Добавить" disabled={code.trim().length < 3} onPress={() => void act(async () => { const r = await api.addFriend(code.trim()); setCode(''); setNote(r.status === 'accepted' ? 'Теперь вы друзья' : 'Заявка отправлена'); })} />
      </View>
      {!!note && <Text style={u.muted}>{note}</Text>}
    </View>

    {friends.incoming.length > 0 && <View style={{ gap: 8 }}>
      <Text style={u.label}>Хотят дружить · {friends.incoming.length}</Text>
      {friends.incoming.map(user => <View key={user.id} style={s.row}>
        <Avatar avatar={user.avatar} size={40} /><View style={{ flex: 1 }}><Text style={u.text}>{user.name}</Text><Text style={u.muted}>@{user.handle}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Принять ${user.name}`} onPress={() => void act(() => api.answerFriend(user.id, 'accept'), `${user.name} теперь в друзьях`)} style={({ pressed }) => [s.iconButton, { backgroundColor: colors.amber }, pressed && u.pressed]}><Glyph name="check" size={18} color={colors.bg} stroke={2.2} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Отклонить ${user.name}`} onPress={() => void act(() => api.answerFriend(user.id, 'decline'))} style={({ pressed }) => [s.iconButton, pressed && u.pressed]}><Glyph name="close" size={18} color={colors.muted} /></Pressable>
      </View>)}
    </View>}

    <View style={{ gap: 8 }}>
      <Text style={u.label}>Друзья · {friends.friends.length}</Text>
      {!friends.friends.length && <Text style={u.muted}>Пока никого. Поделитесь своим кодом — и город станет компанейским.</Text>}
      {friends.friends.map(user => <View key={user.id} style={s.row}><Avatar avatar={user.avatar} size={40} /><View style={{ flex: 1 }}><Text style={u.text}>{user.name}</Text><Text style={u.muted}>@{user.handle}</Text></View></View>)}
      {friends.outgoing.length > 0 && <Text style={u.muted}>Ждут ответа: {friends.outgoing.map(f => f.name).join(', ')}</Text>}
    </View>

    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={u.heading}>Пачки</Text>
        {!newParty && friends.friends.length > 0 && <Button kind="quiet" label="+ Новая" onPress={() => setNewParty({ name: '', ids: [] })} />}
      </View>
      <Text style={u.muted}>Постоянные компании: позвать всех на встречу в одно касание.</Text>
      {newParty && <Card>
        <Field label="Название" value={newParty.name} onChangeText={name => setNewParty({ ...newParty, name })} placeholder="Например, «Сопки по субботам»" />
        <Text style={u.label}>Кто в пачке</Text>
        <View style={u.row}>{friends.friends.map(f => <Chip key={f.id} label={f.name} active={newParty.ids.includes(f.id)} onPress={() => setNewParty({ ...newParty, ids: newParty.ids.includes(f.id) ? newParty.ids.filter(id => id !== f.id) : [...newParty.ids, f.id] })} />)}</View>
        <View style={u.row}>
          <Button primary label="Создать пачку" disabled={!newParty.name.trim() || !newParty.ids.length} onPress={() => void act(async () => { await api.createParty(newParty.name.trim(), newParty.ids); setNewParty(null); }, 'Пачка собрана')} />
          <Button kind="quiet" label="Отмена" onPress={() => setNewParty(null)} />
        </View>
      </Card>}
      {parties.map(p => <View key={p.id} style={s.row}>
        <AvatarStack avatars={p.members.map(m => m.avatar)} size={30} />
        <View style={{ flex: 1 }}><Text style={u.text}>{p.name}</Text><Text style={u.muted}>{p.members.map(m => m.name).join(', ')}</Text></View>
      </View>)}
    </View>

    <Button kind="quiet" label="Выйти из аккаунта" onPress={() => void signOut()} />
  </View>;
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  editBadge: { position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.amber, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.bg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.raised, borderWidth: 1.5, borderColor: 'transparent' },
  swatch: { width: 34, height: 34, borderRadius: 17 },
  swatchOn: { borderWidth: 3, borderColor: colors.text },
  code: { flex: 1, color: colors.amber, fontFamily: 'Manrope_800ExtraBold', fontSize: 30, letterSpacing: 4 },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.raised, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: colors.panel },
});
