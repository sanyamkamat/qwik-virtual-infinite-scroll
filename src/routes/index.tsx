import {
  component$,
  useStore,
  $,
  useSignal,
  Slot,
  useVisibleTask$,
} from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

const callApi = (offset: number, limit: number) => {
  return new Promise((resolve) => {
    const items = [] as any;
    for (let index = offset; index < offset + limit; index++) {
      items.push("label " + index);
    }

    setTimeout(() => {
      resolve(items);
    }, 2000);
  });
};

const UiVirtualScroll = component$(
  ({
    offset = 0,
    buffer,
    limit,
    rowHeight,
    height,
    onPrevCallback,
    onNextCallback,
  }: any) => {
    const overlayRef = useSignal<Element>();

    const store = useStore({
      upperBoundary: offset,
      lowerBoundary: buffer - 1,
      currentScrollTopPosition: 0,
      isLoading: false,
    });

    const handleScroll = $((target: any) => {
      // ignore the scroll if data is loading
      if (store.isLoading) {
        return;
      }

      const scrollTop = Math.round(target.scrollTop);
      const clientHeight = Math.round(target.clientHeight);
      const scrollHeight = Math.round(target.scrollHeight);

      const isUp = scrollTop < store.currentScrollTopPosition;

      if (isUp && scrollTop === 0) {
        store.isLoading = true;

        onPrevCallback(store.upperBoundary - limit).then(() => {
          // update boundaries to move indices - limit
          store.upperBoundary = store.upperBoundary - limit;
          store.lowerBoundary = store.lowerBoundary - limit;

          // move scroll position to 1 limit height
          const scrollPos = limit * rowHeight;
          overlayRef.value.scrollTo(0, scrollPos);
          store.isLoading = false;
        });
      } else if (!isUp && scrollTop + clientHeight >= scrollHeight) {
        store.isLoading = true;

        onNextCallback(store.lowerBoundary).then(() => {
          // update boundaries to move indices + limit
          store.upperBoundary = store.upperBoundary + limit;
          store.lowerBoundary = store.lowerBoundary + limit;

          const scrollPos = limit * rowHeight;
          // move scroll position to 2 limits height
          overlayRef.value.scrollTo(0, scrollPos * 2);
          store.isLoading = false;
        });
      }
      // update the current cursor position
      store.currentScrollTopPosition = scrollTop;
    });

    return (
      <div
        ref={overlayRef}
        style={{ height, overflow: "scroll" }}
        onScroll$={async (e: any) => {
          console.log("scrolling");
          await handleScroll(e.target);
        }}
      >
        <Slot />
      </div>
    );
  }
);

export default component$(() => {
  const limit = 100;
  // the number of items that we want to keep in memory - 300
  const buffer = limit * 3;
  // the number of items that we want to cache when new chunk of data is loaded
  const cache = buffer - limit;
  const items = useSignal<string[]>([]);
  const isLoading = useSignal(false);

  const prevCallback = $((newOffset: number) => {
    isLoading.value = true;

    return callApi(newOffset, limit).then((res: any) => {
      const newItems = [...res, ...items.value.slice(0, cache)] as any;
      items.value = newItems;
      isLoading.value = false;
      return true;
    });
  });

  const nextCallback = $((newOffset: number) => {
    isLoading.value = true;

    return callApi(newOffset, limit).then((res: any) => {
      const newItems = [...items.value.slice(-cache), ...res] as any;
      items.value = newItems;
      isLoading.value = false;
      return true;
    });
  });

  useVisibleTask$(() => {
    console.log("Runs once when the component mounts in the server OR client.");
    isLoading.value = true;
    callApi(1, buffer).then((res: any) => {
      items.value = res;
      isLoading.value = false;
    });
  });

  return (
    <>
      <div class={"App"}>
        <UiVirtualScroll
          buffer={buffer}
          rowHeight={39}
          height="50vh"
          limit={limit}
          onPrevCallback={prevCallback}
          onNextCallback={nextCallback}
        >
          {items.value.length ? (
            items.value.map((item: any, index: number) => (
              <div
                key={index}
                class={"item"}
                style={{
                  padding: "10px",
                  marginBottom: "10px",
                  textAlign: "center",
                }}
              >
                {isLoading.value ? <>Loading...</> : item}
              </div>
            ))
          ) : (
            <>Loading...</>
          )}
        </UiVirtualScroll>
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: "Welcome to Qwik",
  meta: [
    {
      name: "description",
      content: "Qwik site description",
    },
  ],
};
