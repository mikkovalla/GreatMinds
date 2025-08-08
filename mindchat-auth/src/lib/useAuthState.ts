import { ref, computed, onUnmounted } from 'vue';
import { supabase } from './supabaseClient';

const user = ref<ReturnType<typeof Object> | null>(null);
const session = ref<any>(null);

let inited = false;
let subscribers = 0;
let sub: { unsubscribe: () => void } | null = null;

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    sub?.unsubscribe();
    sub = null;
    inited = false;
  });
}

async function init() {
  if (inited || typeof window === 'undefined') return;
  inited = true;

  const [{ data: s }, { data: u }] = await Promise.all([
    supabase.auth.getSession(),
    supabase.auth.getUser(),
  ]);

  session.value = s.session ?? null;
  user.value = u.user ?? s.session?.user ?? null;

  const { data } = supabase.auth.onAuthStateChange((_evt, sess) => {
    session.value = sess ?? null;
    user.value = sess?.user ?? null;
  });
  sub = data.subscription;
}

export function useAuthState() {
  subscribers++;
  init();

  onUnmounted(() => {
    if (--subscribers === 0) {
      sub?.unsubscribe();
      sub = null;
      inited = false; // allow clean re-init if all consumers unmount
    }
  });

  const isLoggedIn = computed(() => !!user.value);
  const isEmailVerified = computed(() => !!user.value?.email_confirmed_at);

  async function refresh() {
    const { data } = await supabase.auth.getUser();
    user.value = data.user ?? null;
  }

  return { user, session, isLoggedIn, isEmailVerified, refresh };
}
