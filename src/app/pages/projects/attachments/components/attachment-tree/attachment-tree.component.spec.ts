import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AttachmentTreeNode } from '../../attachment-tree-node';
import { AttachmentTreeComponent } from './attachment-tree.component';

function node(key: string, extra: Partial<AttachmentTreeNode> = {}): AttachmentTreeNode {
  const [kind, id] = key.split(':') as [AttachmentTreeNode['kind'], string];
  return {
    key,
    kind,
    id,
    code: null,
    title: key,
    itemKind: null,
    fileCount: 1,
    files: [],
    children: [],
    link: null,
    lazy: false,
    loading: false,
    error: false,
    ...extra,
  };
}

describe('AttachmentTreeComponent', () => {
  function render(nodes: AttachmentTreeNode[]) {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AttachmentTreeComponent);
    fixture.componentRef.setInput('nodes', nodes);
    fixture.componentRef.setInput('heading', 'Files');
    fixture.componentRef.setInput('stateKey', 'project:p');
    fixture.componentRef.setInput('defaultOpen', () => false);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  /* Opening every unread ticket would fire a request per ticket at once — 200 in a big project. */
  it('Expand all opens what is loaded and leaves unread tickets shut', () => {
    const opened: string[] = [];
    const loaded = node('ticket:k1', { lazy: true, children: [node('task:t1')] });
    const unread = node('ticket:k2', { lazy: true, loading: true });
    const tree = render([
      node('group:g', { children: [node('milestone:m', { children: [loaded, unread] })] }),
    ]);
    tree.opened.subscribe((item) => opened.push(item.key));

    tree.toggleAll();

    expect([...tree.expanded()].sort()).toEqual(['group:g', 'milestone:m', 'task:t1', 'ticket:k1']);
    expect(opened).toEqual([]);
    expect(tree.allExpanded()).toBe(true);
  });

  it('opening an unread ticket by hand asks for its files', () => {
    const opened: string[] = [];
    const unread = node('ticket:k2', { lazy: true, loading: true });
    const tree = render([unread]);
    tree.opened.subscribe((item) => opened.push(item.key));

    tree.toggle(unread);

    expect(opened).toEqual(['ticket:k2']);
  });

  it('Collapse all closes everything', () => {
    const tree = render([node('group:g', { children: [node('milestone:m')] })]);
    tree.toggleAll();

    tree.toggleAll();

    expect(tree.expanded().size).toBe(0);
  });
});
