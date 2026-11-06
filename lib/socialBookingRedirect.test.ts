import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { redirectForSocialBooking } from "./socialBookingRedirect";

const ORIGIN = "https://yansons.online";

function redirect(path: string) {
  return redirectForSocialBooking(new URL(path, ORIGIN));
}

describe("redirectForSocialBooking", () => {
  it("sends booking aliases to the schedule-call hash", () => {
    for (const path of ["/book", "/book/", "/schedule-call", "/schedule-call/"]) {
      const result = redirect(path);
      assert.ok(result, path);
      assert.equal(result.pathname, "/");
      assert.equal(result.hash, "#schedule-call");
      assert.equal(result.search, "");
    }
  });

  it("keeps unrelated query params on booking aliases", () => {
    const result = redirect("/book?utm=ig&ref=bio");
    assert.ok(result);
    assert.equal(result.pathname, "/");
    assert.equal(result.hash, "#schedule-call");
    assert.equal(result.searchParams.get("utm"), "ig");
    assert.equal(result.searchParams.get("ref"), "bio");
    assert.equal(result.searchParams.get("schedule"), null);
  });

  it("turns an encoded hash path into the matching hash route", () => {
    const booking = redirect("/%23schedule-call");
    assert.ok(booking);
    assert.equal(booking.pathname, "/");
    assert.equal(booking.hash, "#schedule-call");

    const work = redirect("/%23work");
    assert.ok(work);
    assert.equal(work.pathname, "/");
    assert.equal(work.hash, "#work");

    const nested = redirect("/projects/lumano%23schedule-call?utm=ig");
    assert.ok(nested);
    assert.equal(nested.pathname, "/projects/lumano");
    assert.equal(nested.hash, "#schedule-call");
    assert.equal(nested.searchParams.get("utm"), "ig");
  });

  it("drops a trailing slash that was encoded into the hash", () => {
    const result = redirect("/%23schedule-call/");
    assert.ok(result);
    assert.equal(result.pathname, "/");
    assert.equal(result.hash, "#schedule-call");
  });

  it("opens booking from ?schedule=call and keeps the current path", () => {
    const home = redirect("/?schedule=call");
    assert.ok(home);
    assert.equal(home.pathname, "/");
    assert.equal(home.hash, "#schedule-call");
    assert.equal(home.search, "");

    const project = redirect("/projects/lumano?schedule=call&utm=ig");
    assert.ok(project);
    assert.equal(project.pathname, "/projects/lumano");
    assert.equal(project.hash, "#schedule-call");
    assert.equal(project.searchParams.get("utm"), "ig");
    assert.equal(project.searchParams.get("schedule"), null);
  });

  it("leaves ordinary and asset requests alone", () => {
    assert.equal(redirect("/"), null);
    assert.equal(redirect("/archive"), null);
    assert.equal(redirect("/projects/lumano"), null);
    assert.equal(redirect("/?utm=ig"), null);
    assert.equal(redirect("/?schedule=later"), null);
    assert.equal(redirect("/booking"), null);
    assert.equal(redirect("/book/extra"), null);
    assert.equal(redirect("/%23"), null);
    assert.equal(redirect("/og.png?schedule=call"), null);
    assert.equal(redirect("/api/contact?schedule=call"), null);
    assert.equal(redirect("/_next/static/chunk.js?schedule=call"), null);
  });
});
